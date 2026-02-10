using System.Text;
using ChessPlatform.Api.Models;

namespace ChessPlatform.Api.Services;

public interface IPgnService
{
    string GeneratePgn(ActiveGame game, string result, string whiteName, string blackName);
}

public class PgnService : IPgnService
{
    public string GeneratePgn(ActiveGame game, string result, string whiteName, string blackName)
    {
        var timeControl = TimeControls.Get(game.TimeControlId);
        var sb = new StringBuilder();

        sb.AppendLine($"[Event \"Rated {timeControl?.Name ?? game.TimeControlId} game\"]");
        sb.AppendLine("[Site \"ChessPlatform\"]");
        sb.AppendLine($"[Date \"{game.StartedAt:yyyy.MM.dd}\"]");
        sb.AppendLine($"[White \"{whiteName}\"]");
        sb.AppendLine($"[Black \"{blackName}\"]");
        sb.AppendLine($"[Result \"{result}\"]");
        sb.AppendLine();

        var moves = game.SanHistory;
        var moveLine = new StringBuilder();
        for (int i = 0; i < moves.Count; i++)
        {
            if (i % 2 == 0)
            {
                moveLine.Append($"{i / 2 + 1}. ");
            }
            moveLine.Append(moves[i]);
            moveLine.Append(' ');
        }
        moveLine.Append(result);

        sb.Append(moveLine);
        return sb.ToString();
    }
}
