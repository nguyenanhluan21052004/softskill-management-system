using Microsoft.EntityFrameworkCore;
using Soff_skil.Data;
using Soff_skil.DTOs;

namespace Soff_skil.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _dbContext;

    public AuthService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request, CancellationToken cancellationToken = default)
    {
        var normalizedUsername = request.Username.Trim();

        var user = await _dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Username == normalizedUsername, cancellationToken);

        if (user is null || !PasswordHasher.VerifyPassword(request.Password, user.Password))
        {
            return null;
        }

        return new LoginResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role
        };
    }
}
