using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Soff_skil.DTOs;
using Soff_skil.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Soff_skil.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequestDto request, CancellationToken cancellationToken)
    {
        var user = await _authService.LoginAsync(request, cancellationToken);

        if (user == null)
        {
            _logger.LogWarning("Login failed for username {Username}.", request.Username);
            return Unauthorized("Invalid username/password");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            _logger.LogError("Missing Jwt:Key in configuration.");
            return StatusCode(StatusCodes.Status500InternalServerError, "JWT configuration is invalid.");
        }

        var key = Encoding.UTF8.GetBytes(jwtKey);

        var claims = new[]
        {
            new Claim("id", user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256)
        );

        var jwt = tokenHandler.WriteToken(token);

        return Ok(new
        {
            token = jwt,
            id = user.Id,
            username = user.Username,
            role = user.Role
        });
    }
}
