using ChessPlatform.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChessPlatform.Api.Data.Configurations;

public class GameConfiguration : IEntityTypeConfiguration<Game>
{
    public void Configure(EntityTypeBuilder<Game> builder)
    {
        builder.ToTable("games");

        builder.HasKey(g => g.Id);
        builder.Property(g => g.Id)
            .HasColumnName("id")
            .ValueGeneratedOnAdd();

        builder.Property(g => g.WhitePlayerId)
            .HasColumnName("white_player_id")
            .IsRequired();

        builder.Property(g => g.BlackPlayerId)
            .HasColumnName("black_player_id")
            .IsRequired();

        builder.Property(g => g.TimeControl)
            .HasColumnName("time_control")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(g => g.Result)
            .HasColumnName("result")
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(g => g.Termination)
            .HasColumnName("termination")
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(g => g.Pgn)
            .HasColumnName("pgn")
            .IsRequired();

        builder.Property(g => g.FinalFen)
            .HasColumnName("final_fen")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(g => g.WhiteRatingBefore)
            .HasColumnName("white_rating_before")
            .IsRequired();

        builder.Property(g => g.BlackRatingBefore)
            .HasColumnName("black_rating_before")
            .IsRequired();

        builder.Property(g => g.WhiteRatingAfter)
            .HasColumnName("white_rating_after")
            .IsRequired();

        builder.Property(g => g.BlackRatingAfter)
            .HasColumnName("black_rating_after")
            .IsRequired();

        builder.Property(g => g.StartedAt)
            .HasColumnName("started_at")
            .IsRequired();

        builder.Property(g => g.EndedAt)
            .HasColumnName("ended_at")
            .IsRequired();

        builder.HasOne(g => g.WhitePlayer)
            .WithMany()
            .HasForeignKey(g => g.WhitePlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(g => g.BlackPlayer)
            .WithMany()
            .HasForeignKey(g => g.BlackPlayerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(g => new { g.WhitePlayerId, g.EndedAt })
            .IsDescending(false, true);

        builder.HasIndex(g => new { g.BlackPlayerId, g.EndedAt })
            .IsDescending(false, true);
    }
}
