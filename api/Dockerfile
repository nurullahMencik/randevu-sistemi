# syntax=docker/dockerfile:1

# ---- build ---------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached until a project file changes.
COPY global.json Directory.Build.props Directory.Packages.props .editorconfig ./
COPY src/Randevu.Domain/Randevu.Domain.csproj src/Randevu.Domain/
COPY src/Randevu.Application/Randevu.Application.csproj src/Randevu.Application/
COPY src/Randevu.Infrastructure/Randevu.Infrastructure.csproj src/Randevu.Infrastructure/
COPY src/Randevu.Api/Randevu.Api.csproj src/Randevu.Api/
RUN dotnet restore src/Randevu.Api/Randevu.Api.csproj

COPY src/ src/
RUN dotnet publish src/Randevu.Api/Randevu.Api.csproj -c Release -o /app/publish --no-restore -p:UseAppHost=false

# ---- runtime -------------------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Render injects PORT; Program.cs binds to it (8080 when run elsewhere).
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS= \
    PORT=8080 \
    ConnectionStrings__Default="Data Source=/app/App_Data/randevu.db"

COPY --from=build /app/publish .
# SQLite lives on the container's ephemeral disk: a restart re-seeds fresh demo data.
RUN mkdir -p /app/App_Data && chown -R $APP_UID /app/App_Data
USER $APP_UID

EXPOSE 8080
ENTRYPOINT ["dotnet", "Randevu.Api.dll"]
