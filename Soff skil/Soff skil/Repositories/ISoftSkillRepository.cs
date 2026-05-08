using Soff_skil.Models;

namespace Soff_skil.Repositories;

public interface ISoftSkillRepository
{
    Task<IReadOnlyList<ProgressTracking>> GetLatestProgressAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProgressTracking>> GetTopProgressAsync(int limit, CancellationToken cancellationToken = default);
}
