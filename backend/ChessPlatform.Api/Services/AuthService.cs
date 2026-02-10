using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChessPlatform.Api.Data;
using ChessPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ChessPlatform.Api.Services;

public class AuthService
{
    private readonly ChessPlatformDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(ChessPlatformDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<User> UpsertUserAsync(string provider, string providerId, string displayName, string? avatarUrl)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Provider == provider && u.ProviderId == providerId);

        if (user is not null)
        {
            user.DisplayName = displayName;
            user.AvatarUrl = avatarUrl;
            user.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Provider = provider,
                ProviderId = providerId,
                DisplayName = displayName,
                AvatarUrl = avatarUrl,
                RatingBullet = 1200,
                RatingBlitz = 1200,
                RatingRapid = 1200,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }

        await _db.SaveChangesAsync();
        return user;
    }

    public string GenerateJwt(User user)
    {
        var secret = _config["Auth:Jwt:Secret"]!;
        var issuer = _config["Auth:Jwt:Issuer"] ?? "ChessPlatform";
        var expiryHours = int.Parse(_config["Auth:Jwt:ExpiryHours"] ?? "24");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("name", user.DisplayName),
            new Claim("avatar", user.AvatarUrl ?? string.Empty)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: issuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
