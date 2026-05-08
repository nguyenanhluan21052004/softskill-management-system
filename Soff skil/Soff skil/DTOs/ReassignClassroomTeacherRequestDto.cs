using System.ComponentModel.DataAnnotations;

namespace Soff_skil.DTOs;

public class ReassignClassroomTeacherRequestDto
{
    [Range(1, int.MaxValue)]
    public int TeacherId { get; set; }
}
