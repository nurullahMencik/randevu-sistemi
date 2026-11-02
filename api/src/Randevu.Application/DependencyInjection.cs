using System.Globalization;
using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Randevu.Application.Common;
using Randevu.Application.Features.Admin;
using Randevu.Application.Features.Appointments;
using Randevu.Application.Features.Auth;
using Randevu.Application.Features.Availability;
using Randevu.Application.Features.Catalog;
using Randevu.Application.Features.Dashboard;

namespace Randevu.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<BusinessOptions>().Bind(configuration.GetSection(BusinessOptions.SectionName));
        services.AddOptions<AuthOptions>().Bind(configuration.GetSection(AuthOptions.SectionName));

        ValidatorOptions.Global.LanguageManager.Culture = CultureInfo.GetCultureInfo("tr");
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly, includeInternalTypes: true);

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<BusinessClock>();

        services.AddScoped<AuthService>();
        services.AddScoped<CatalogService>();
        services.AddScoped<AvailabilityEngine>();
        services.AddScoped<AvailabilityService>();
        services.AddScoped<BookingService>();
        services.AddScoped<AppointmentQueryService>();
        services.AddScoped<ServiceAdminService>();
        services.AddScoped<StaffAdminService>();
        services.AddScoped<DashboardService>();
        return services;
    }
}
