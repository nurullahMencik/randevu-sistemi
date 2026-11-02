using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;

namespace Randevu.Api.Infrastructure;

internal static class OpenApiSetup
{
    public const string BearerScheme = "Bearer";

    public static IServiceCollection AddRandevuOpenApi(this IServiceCollection services) =>
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info = new OpenApiInfo
                {
                    Title = "Randevu API",
                    Version = "v1",
                    Description =
                        "Çok personelli hizmet işletmeleri için online randevu sistemi. " +
                        "Demo hesaplar: admin@randevu.demo, personel@randevu.demo, musteri@randevu.demo — parola: Demo123!. " +
                        "Önce POST /api/auth/login ile belirteç alın, ardından Authorize ile Bearer olarak ekleyin.",
                    Contact = new OpenApiContact { Name = "Nurullah Mencik", Url = new Uri("https://github.com/nurullahmencik") },
                    License = new OpenApiLicense { Name = "MIT" },
                };
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
                document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Description = "POST /api/auth/login yanıtındaki accessToken (15 dk geçerli).",
                };
                return Task.CompletedTask;
            });

            options.AddOperationTransformer((operation, context, _) =>
            {
                var metadata = context.Description.ActionDescriptor.EndpointMetadata;
                var requiresAuth = metadata.OfType<IAuthorizeData>().Any() && !metadata.OfType<IAllowAnonymous>().Any();
                if (requiresAuth)
                {
                    operation.Security ??= [];
                    operation.Security.Add(new OpenApiSecurityRequirement
                    {
                        [new OpenApiSecuritySchemeReference(BearerScheme, context.Document)] = [],
                    });
                }

                return Task.CompletedTask;
            });
        });
}
