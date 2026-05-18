# Повторно заполнить БД демо-данными (клубы, ПК, тарифы, брони).
# Требуется запущенный контейнер: docker compose up -d
#
# Важно: не передаём SQL через pipe PowerShell — иначе кириллица ломается.
# Копируем файл в контейнер и выполняем psql -f.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$seedFile = Join-Path $PSScriptRoot "02_seed.sql"
$schemaFile = Join-Path $PSScriptRoot "01_schema.sql"

if (-not (Test-Path $seedFile)) {
    Write-Error "Не найден файл: $seedFile"
}

$container = "pc_club_db"
$running = docker ps --filter "name=$container" --format "{{.Names}}" 2>$null
if (-not $running) {
    Write-Host "Контейнер $container не запущен. Выполняю docker compose up -d ..."
    Set-Location $root
    docker compose up -d
    Start-Sleep -Seconds 3
}

function Invoke-SqlFile {
    param(
        [string]$LocalPath,
        [string]$RemoteName
    )
    $remotePath = "/tmp/$RemoteName"
    docker cp $LocalPath "${container}:${remotePath}"
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed for $LocalPath"
    }
    docker exec $container psql -U postgres -d pc_club -v ON_ERROR_STOP=1 -f $remotePath
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for $RemoteName"
    }
    docker exec $container rm -f $remotePath | Out-Null
}

if (Test-Path $schemaFile) {
    Write-Host "Проверка схемы: $schemaFile"
    Invoke-SqlFile -LocalPath $schemaFile -RemoteName "01_schema.sql"
}

Write-Host "Применяю seed (UTF-8): $seedFile"
Invoke-SqlFile -LocalPath $seedFile -RemoteName "02_seed.sql"

Write-Host "Готово. Демо-данные загружены."
Write-Host "Пользователи: user@example.com / ivanov / petrova / sidorov — пароль password123"
Write-Host "Админы: admin@example.com и др. — пароль admin123"
