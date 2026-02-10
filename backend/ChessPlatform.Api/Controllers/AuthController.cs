using System.Security.Claims;
using ChessPlatform.Api.Data;
using ChessPlatform.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Controllers;

[ApiController]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly ChessPlatformDbContext _db;
    private readonly IConfiguration _config;
    private readonly IWebHostEnvironment _env;

    public AuthController(AuthService authService, ChessPlatformDbContext db, IConfiguration config, IWebHostEnvironment env)
    {
        _authService = authService;
        _db = db;
        _config = config;
        _env = env;
    }

    [HttpGet("api/auth/login/{provider}")]
    public IActionResult Login(string provider)
    {
        var scheme = provider.ToLowerInvariant() switch
        {
            "google" => "Google",
            "github" => "GitHub",
            _ => null
        };

        if (scheme is null)
            return BadRequest(new { error = $"Invalid provider: {provider}" });

        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback), new { provider })
        };

        return Challenge(properties, scheme);
    }

    [HttpGet("api/auth/callback/{provider}")]
    public async Task<IActionResult> Callback(string provider)
    {
        var result = await HttpContext.AuthenticateAsync(provider.ToLowerInvariant() switch
        {
            "google" => "Google",
            "github" => "GitHub",
            _ => null!
        });

        if (result?.Principal is null)
            return BadRequest(new { error = "Authentication failed" });

        var claims = result.Principal;
        var providerId = claims.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
        var displayName = claims.FindFirstValue(ClaimTypes.Name) ?? claims.FindFirstValue(ClaimTypes.Email) ?? "Unknown";
        var avatarUrl = claims.FindFirstValue("urn:google:picture")
                     ?? claims.FindFirstValue("urn:github:avatar_url");

        var user = await _authService.UpsertUserAsync(
            provider.ToLowerInvariant(), providerId, displayName, avatarUrl);

        var jwt = _authService.GenerateJwt(user);

        Response.Cookies.Append("auth_token", jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(24)
        });

        var frontendUrl = _config["Auth:FrontendUrl"] ?? "http://localhost:5173";
        return Redirect(frontendUrl);
    }

    [HttpPost("api/auth/logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("auth_token");
        return Ok(new { message = "Logged out" });
    }

    [Authorize]
    [HttpGet("api/user/me")]
    public async Task<IActionResult> Me()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return NotFound();

        return Ok(new
        {
            id = user.Id,
            displayName = user.DisplayName,
            avatarUrl = user.AvatarUrl,
            ratingBullet = user.RatingBullet,
            ratingBlitz = user.RatingBlitz,
            ratingRapid = user.RatingRapid
        });
    }

    /// <summary>
    /// Dev-only endpoint: creates a test user and sets auth cookie without OAuth.
    /// </summary>
    [HttpPost("api/auth/dev-login")]
    public async Task<IActionResult> DevLogin([FromBody] DevLoginRequest? request)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var displayName = request?.DisplayName ?? "Dev User";
        var providerId = request?.ProviderId ?? "dev-user-1";

        var user = await _authService.UpsertUserAsync(
            "dev", providerId, displayName, null);

        var jwt = _authService.GenerateJwt(user);

        Response.Cookies.Append("auth_token", jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(24)
        });

        return Ok(new { message = "Logged in", userId = user.Id, displayName = user.DisplayName, token = jwt });
    }
}

public class DevLoginRequest
{
    public string? DisplayName { get; set; }
    public string? ProviderId { get; set; }
}
