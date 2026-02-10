using System.Security.Claims;
using System.Text;
using System.Text.Json;
using ChessPlatform.Api.Data;
using ChessPlatform.Api.Hubs;
using ChessPlatform.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration["Auth:FrontendUrl"] ?? "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure DbContext
builder.Services.AddDbContext<ChessPlatformDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JSON serialization
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.AllowTrailingCommas = false;
});

// Register AuthService
builder.Services.AddScoped<AuthService>();

// Register ChessEngineService
builder.Services.AddSingleton<IChessEngineService, ChessEngineService>();

// Register GameStateManager
builder.Services.AddSingleton<IGameStateManager, GameStateManager>();

// Register ClockService
builder.Services.AddSingleton<IClockService, ClockService>();

// Register Matchmaking
builder.Services.AddSingleton<IMatchmakingService, MatchmakingService>();
builder.Services.AddHostedService<MatchmakingBackgroundService>();

// Register FlagDetectionService
builder.Services.AddHostedService<FlagDetectionService>();

// Register Rating, PGN, and GameCompletion services
builder.Services.AddSingleton<IRatingService, RatingService>();
builder.Services.AddSingleton<IPgnService, PgnService>();
builder.Services.AddScoped<IGameCompletionService, GameCompletionService>();

// Register ReconnectionTimerService
builder.Services.AddSingleton<IReconnectionTimerService, ReconnectionTimerService>();

// Configure Authentication
var jwtSecret = builder.Configuration["Auth:Jwt:Secret"] ?? "CHANGE_ME_IN_PRODUCTION_AT_LEAST_32_CHARACTERS_LONG!";
var jwtIssuer = builder.Configuration["Auth:Jwt:Issuer"] ?? "ChessPlatform";
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtIssuer,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = jwtKey,
        ValidateLifetime = true
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // Priority: Authorization header > query param > cookie.
            // Authorization header: let the default JWT handler use it (enables per-window sessionStorage tokens).
            if (!string.IsNullOrEmpty(context.Request.Headers.Authorization.ToString()))
                return Task.CompletedTask;

            // SignalR WebSocket: access_token query param (from accessTokenFactory)
            var accessToken = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(accessToken))
            {
                context.Token = accessToken;
                return Task.CompletedTask;
            }

            // Fallback: HTTP-only cookie (OAuth flow)
            context.Token = context.Request.Cookies["auth_token"];
            return Task.CompletedTask;
        }
    };
});

// Only register OAuth schemes when credentials are configured
var googleClientId = builder.Configuration["Auth:Google:ClientId"];
if (!string.IsNullOrEmpty(googleClientId))
{
    authBuilder.AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = builder.Configuration["Auth:Google:ClientSecret"] ?? string.Empty;
        options.CallbackPath = "/signin-google";
    });
}

var githubClientId = builder.Configuration["Auth:GitHub:ClientId"];
if (!string.IsNullOrEmpty(githubClientId))
{
    authBuilder.AddOAuth("GitHub", options =>
    {
        options.ClientId = githubClientId;
        options.ClientSecret = builder.Configuration["Auth:GitHub:ClientSecret"] ?? string.Empty;
        options.CallbackPath = "/signin-github";
        options.AuthorizationEndpoint = "https://github.com/login/oauth/authorize";
        options.TokenEndpoint = "https://github.com/login/oauth/access_token";
        options.UserInformationEndpoint = "https://api.github.com/user";
        options.ClaimActions.MapJsonKey(ClaimTypes.NameIdentifier, "id");
        options.ClaimActions.MapJsonKey(ClaimTypes.Name, "login");
        options.ClaimActions.MapJsonKey("urn:github:avatar_url", "avatar_url");
        options.Events = new OAuthEvents
        {
            OnCreatingTicket = async context =>
            {
                var request = new HttpRequestMessage(HttpMethod.Get, context.Options.UserInformationEndpoint);
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", context.AccessToken);
                request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
                var response = await context.Backchannel.SendAsync(request, context.HttpContext.RequestAborted);
                response.EnsureSuccessStatusCode();
                var user = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
                context.RunClaimActions(user.RootElement);
            }
        };
    });
}

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// Register ConnectionTracker
builder.Services.AddSingleton<IConnectionTracker, ConnectionTracker>();

// Configure SignalR
builder.Services.AddSignalR(options =>
{
    options.AddFilter<GameHubFilter>();
});

var app = builder.Build();

// Auto-migrate in Development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ChessPlatformDbContext>();
    db.Database.Migrate();
}

app.UseCors();

// Global API error handling middleware
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                data = (object?)null,
                error = new { code = "INTERNAL_ERROR", message = "An unexpected error occurred" }
            });
        }
        else
        {
            throw;
        }
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/hubs/game");

app.MapGet("/health", () => Results.Ok(new
{
    Status = "healthy",
    Timestamp = DateTime.UtcNow
}));

app.Run();
