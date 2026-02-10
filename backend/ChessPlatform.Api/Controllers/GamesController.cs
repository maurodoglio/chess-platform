using System.Security.Claims;
using ChessPlatform.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChessPlatform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
    private readonly ChessPlatformDbContext _db;

    public GamesController(ChessPlatformDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetGames([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Games
            .Include(g => g.WhitePlayer)
            .Include(g => g.BlackPlayer)
            .Where(g => g.WhitePlayerId == userId || g.BlackPlayerId == userId);

        var totalCount = await query.CountAsync();

        var games = await query
            .OrderByDescending(g => g.EndedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new
            {
                g.Id,
                OpponentName = g.WhitePlayerId == userId ? g.BlackPlayer.DisplayName : g.WhitePlayer.DisplayName,
                OpponentAvatar = g.WhitePlayerId == userId ? g.BlackPlayer.AvatarUrl : g.WhitePlayer.AvatarUrl,
                PlayerColor = g.WhitePlayerId == userId ? "white" : "black",
                Result = g.Result,
                PlayerResult = g.Result == "draw" ? "draw"
                    : (g.Result == "white" && g.WhitePlayerId == userId) || (g.Result == "black" && g.BlackPlayerId == userId)
                        ? "win" : "loss",
                g.Termination,
                g.TimeControl,
                RatingBefore = g.WhitePlayerId == userId ? g.WhiteRatingBefore : g.BlackRatingBefore,
                RatingAfter = g.WhitePlayerId == userId ? g.WhiteRatingAfter : g.BlackRatingAfter,
                g.EndedAt
            })
            .ToListAsync();

        return Ok(new { data = new { games, totalCount, page, pageSize } });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGame(Guid id)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (sub is null || !Guid.TryParse(sub, out var userId))
            return Unauthorized();

        var game = await _db.Games
            .Include(g => g.WhitePlayer)
            .Include(g => g.BlackPlayer)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (game is null)
            return NotFound();

        if (game.WhitePlayerId != userId && game.BlackPlayerId != userId)
            return Forbid();

        return Ok(new
        {
            game.Id,
            WhiteName = game.WhitePlayer.DisplayName,
            WhiteAvatar = game.WhitePlayer.AvatarUrl,
            BlackName = game.BlackPlayer.DisplayName,
            BlackAvatar = game.BlackPlayer.AvatarUrl,
            game.TimeControl,
            game.Result,
            game.Termination,
            game.Pgn,
            game.FinalFen,
            game.WhiteRatingBefore,
            game.WhiteRatingAfter,
            game.BlackRatingBefore,
            game.BlackRatingAfter,
            game.StartedAt,
            game.EndedAt
        });
    }
}
