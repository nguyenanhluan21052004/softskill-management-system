namespace Soff_skil.DTOs;

public class ImportExcelResponseDto
{
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public IReadOnlyList<string> Errors { get; set; } = [];
}
