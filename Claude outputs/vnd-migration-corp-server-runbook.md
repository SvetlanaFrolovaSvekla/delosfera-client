# Перенос ВНД (isrib → delosfera) на корпоративный тестовый сервер

Собрано по коду `IsribMigration` и `delosfera-server` (миграции, `LocalOrgUnitMapper`, `TypeOrganMapper`, `Program.cs`). Порядок ниже — не догадка, а то, что диктует сам код скрипта и структура EF-миграций.

## 0. Бэкап перед любыми чистками

Тестовый сервер тестовый, но `TRUNCATE ... CASCADE` может утащить за собой больше, чем кажется (см. шаг 2) — сначала снимите копию, чтобы откатиться одной командой, если что-то пойдёт не так.

В `delosfera-server/ops/` уже есть готовые скрипты:

```bash
# на самом тестовом сервере (там, где видны postgres и minio)
PGHOST=... PGUSER=... PGDATABASE=delosfera BACKUP_ROOT=/tmp/delosfera-backup ./backup.sh
```

Он делает `pg_dump -Fc` базы и `mc mirror` бакета minio в один каталог с таймстампом. `restore.sh` рядом — для отката.

## 1. Привести справочники в соответствие — это делают EF-миграции, а не ручной SQL

Ключевая находка: то, что вы называете «справочники встали на место» локально — это не ручная правка, а применение миграций `delosfera-server`. Конкретно:

- `Migrations/20260907050943_ReplaceOrgUnitsWithRealStructure.cs` — грузит реальную оргструктуру банка (149 подразделений, те же id, что должны быть на сервере) в `dictionary_organization_unit`.
- `Migrations/20260907072725_ReplaceKeywordRubricWithIsrib.cs` — грузит `dictionary_keyword` (19 записей) и `dictionary_rubric` (16 записей).
- Более ранние миграции (`AddApprovalBody`, `AdminConfigurableTypes` и т.д.) заводят `dictionary_type_vnd` / `dictionary_approval_body` — под них `TypeOrganMapper.cs` жёстко прописывает id (`type_id` 1–20, `organ_id` 1–8). Если на сервере эти id не совпадут с тем, что ожидает маппер, миграция ВНД будет падать или писать не в те справочники.

В `Program.cs` (`delosfera-server`) на старте вызывается `db.Database.Migrate()` — то есть **достаточно один раз запустить `delosfera-server` с connection string, указывающим на базу `delosfera` на тестовом сервере**, и все ещё не применённые миграции применятся сами. Альтернатива — `dotnet ef database update` из корня `delosfera-server` с тем же connection string, без поднятия самого приложения.

Так как оба проекта (`delosfera-server`, `delosfera-client`) на корпоративном компьютере «полностью соответствуют» локальным — набор миграций в коде одинаковый, спорить с версией на сервере не придётся: `dotnet ef database update` либо накатит недостающее, либо скажет, что всё уже применено.

**Проверка перед стартом** — что реально применено на сервере сейчас:

```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId" DESC LIMIT 10;
```

Если там нет `20260907050943_ReplaceOrgUnitsWithRealStructure` и `20260907072725_ReplaceKeywordRubricWithIsrib` — их обязательно нужно накатить до запуска скрипта миграции ВНД, иначе `LocalOrgUnitMapper` не найдёт подразделение-заглушку «Управление делами» и упадёт с исключением при первом же документе (см. код: `throw new InvalidOperationException($"Подразделение-заглушка '{PlaceholderOrgUnitTitle}' не найдено...")`).

## 2. Почистить тестовые ВНД

Из `migration_spec_vnd.md`:

```sql
TRUNCATE vnd_document, vnd_redaction CASCADE;
```

⚠️ **Проверьте, что именно утащит CASCADE**, прежде чем нажимать — в базе уже есть таблицы вроде `vnd_approval_process`, `vnd_redaction_attachment`, `vnd_actualization_*`, M2M-связки (`vnd_keyword`, `vnd_rubric`, `vnd_responsible_executor`) и т.п., которые ссылаются на `vnd_document`/`vnd_redaction` внешними ключами. Если на тестовом сервере кто-то уже гонял через них реальные тестовые сценарии (согласования, актуализацию) — они тоже уйдут. Посмотреть, что зависит, можно так:

```sql
SELECT conrelid::regclass AS dependent_table
FROM pg_constraint
WHERE confrelid IN ('vnd_document'::regclass, 'vnd_redaction'::regclass)
  AND contype = 'f';
```

Если там что-то ценное — сначала разберитесь, стоит ли это сохранять, или бэкап из шага 0 — ваш путь назад.

Справочники (`dictionary_*`) этот TRUNCATE не трогает — их приводит в порядок шаг 1.

## 3. Настроить `IsribMigration/appsettings.json` под корпоративное окружение

Сейчас в файле — локальные (дев) значения:

```json
{
  "ConnectionStrings": {
    "Isrib": "Server=DESKTOP-B407AOR\\SQLEXPRESS;Database=isrib;Integrated Security=True;TrustServerCertificate=True;",
    "Delosfera": "Host=localhost;Port=5432;Database=delosfera;Username=postgres;Password=1234"
  },
  "Migration": {
    "Minio": {
      "Endpoint": "localhost:9000",
      "AccessKey": "minioadmin",
      "SecretKey": "minioadmin",
      "Bucket": "delosfera-vnd",
      "UseSsl": false
    }
  }
}
```

На корпоративном компьютере поменять нужно три вещи:

- **`Isrib`** — сервер SQL Server изменится на имя инстанса на корпоративном компьютере (там, где вы подняли `isrib` в SSMS локально на этой машине). Обычно `Server=.\SQLEXPRESS` или конкретное имя инстанса — уточните в SSMS (свойства подключения / `SELECT @@SERVERNAME`).
- **`Delosfera`** — должен указывать не на `localhost`, а на реальный Postgres тестового сервера (хост/порт/пользователь/пароль). Эти значения есть в `appsettings.json` / `.env` самого `delosfera-server`, развёрнутого на тестовом сервере (docker-compose) — их и возьмите оттуда, а не выдумывайте заново.
- **`Minio`** — то же самое: endpoint, access/secret key и бакет тестового сервера, а не `localhost:9000/minioadmin`. Тоже смотрите в конфиге/`.env` развёрнутого `delosfera-server`.

Плюс проверьте **`Migration:MigrationUserId` (сейчас `13`)** — это `uploaded_by_user_id` для загружаемых файлов. Id должен существовать в таблице `users` целевой базы. Если пользователь с id=13 в тестовой базе не тот (или его нет) — замените на реальный существующий id (например, свой аккаунт или служебного пользователя).

## 4. Сухой прогон (без `--write`) — проверка резолвинга

```bash
dotnet run
```

Это ничего не пишет — только читает isrib, резолвит подразделения/тип/орган/ключевые слова против **вашей корпоративной базы delosfera** и печатает результат в консоль. Смотрите на:

- сколько документов резолвится с `⚠ ЗАГЛУШКА` (значит подразделение/тип не нашлись по названию в `dictionary_organization_unit` / `TypeOrganMapper`) — если подряд идут пачками, это симптом того, что шаг 1 (миграции) не применился как надо, а не единичный edge case из спеки;
- совпадает ли `developer_id`, `organ_id`, `type_id` с ожидаемым.

Если заглушек ощутимо больше, чем ~18 (8 из `razrab` + пара по `vid_akta`/`title`, как задокументировано в спеке) — стоп, разбираться со справочниками, а не запускать `--write`.

## 5. Пилот на 2 документах

В `appsettings.json` уже заданы `PilotDocumentCodes: [7181, 7031]`. Сначала — без Minio, чтобы не трогать боевое хранилище файлов теста:

```bash
dotnet run -- --write --local-files
```

Файлы лягут в `./migration_local_files` рядом с exe, а не в MinIO — удобно проверить, что весь пайплайн (включая конвертацию HTML→DOCX через Word) отрабатывает, не создавая мусор в реальном хранилище. Затем — по-настоящему, с MinIO, теми же 2 документами:

```bash
dotnet run -- --write
```

Откройте оба документа в интерфейсе delosfera на тестовом сервере, проверьте карточку, редакцию, вложения.

## 6. Полный перенос

```bash
dotnet run -- --write --all
```

747 документов, каждый — в своей try/catch: один битый документ не остановит прогон. В конце — сводка (перенесено / пропущено / упало) и, если были ошибки, файл `migration_failures_<timestamp>.log` рядом с exe.

После прогона проверьте runtime-предупреждения, которые скрипт печатает по ходу (и пишет в `reviewComment` на редакции документов):

- документы с заглушкой разработчика «Управление информационных технологий» (для ~8 неразрешённых названий `razrab`) — донастроить вручную;
- документы с пустым `vnd_responsible_executor` (~100 случаев `podrazd`-должностей, сознательно отложенных) — дозаполнить вручную;
- документы с заглушкой `title_ru` вида «Документ <код> (заголовок не указан в isrib)»;
- документы с дефолтным `type_id` = Порядок (когда `vid_akta` в isrib был пуст).

Это всё осознанно принятые ограничения из `migration_spec_vnd.md` (раздел 7), не баг скрипта.

## Итоговый порядок одной строкой

Бэкап → миграции `delosfera-server` на целевую БД (или просто поднять сервер на ней) → `TRUNCATE vnd_document, vnd_redaction CASCADE` → поправить `appsettings.json` скрипта на реальные connection strings сервера → dry-run → пилот на 2 документах (`--local-files`, потом реально) → `--write --all` → разбор ⚠-пометок руками.
