using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Randevu.Application.Abstractions;
using Randevu.Infrastructure.Identity;
using Randevu.Infrastructure.Persistence;
using Randevu.Infrastructure.Persistence.Seed;

namespace Randevu.Infrastructure;

public static class DependencyInjection
{
    public const string DefaultSqliteConnection = "Data Source=App_Data/randevu.db";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var database = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        var connectionString = configuration.GetConnectionString("Default");

        if (database.IsPostgres)
        {
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("ConnectionStrings:Default is required when Database:Provider is Postgres.");
            }

            services.AddDbContext<PostgresAppDbContext>(o => o.UseNpgsql(
                connectionString,
                npgsql => npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
            services.AddScoped<AppDbContext>(sp => sp.GetRequiredService<PostgresAppDbContext>());
        }
        else
        {
            services.AddDbContext<SqliteAppDbContext>(o => o.UseSqlite(
                string.IsNullOrWhiteSpace(connectionString) ? DefaultSqliteConnection : connectionString,
                sqlite => sqlite.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery)));
            services.AddScoped<AppDbContext>(sp => sp.GetRequiredService<SqliteAppDbContext>());
        }

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddOptions<SeedOptions>().Bind(configuration.GetSection(SeedOptions.SectionName));
        services.AddScoped<DemoDataSeeder>();

        services.AddSingleton<IPasswordHasher, IdentityPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(o => System.Text.Encoding.UTF8.GetByteCount(o.Key) >= 32, "Jwt:Key must be at least 32 bytes (set the Jwt__Key environment variable).")
            .ValidateOnStart();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearer, jwt) =>
            {
                var o = jwt.Value;
                bearer.MapInboundClaims = false;
                bearer.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = o.Issuer,
                    ValidAudience = o.Audience,
                    IssuerSigningKey = JwtTokenService.CreateKey(o.Key),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "name",
                    RoleClaimType = "role",
                };
            });

        return services;
    }
}
