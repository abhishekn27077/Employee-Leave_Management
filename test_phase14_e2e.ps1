$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:8080/api"

Write-Host "=== PHASE 14 FULL-STACK E2E VERIFICATION SCRIPT ===" -ForegroundColor Cyan

# 1. Create Department
$deptPayload = @{ name = "Verification Operations $(Get-Random -Minimum 1000 -Maximum 9999)" } | ConvertTo-Json
$deptResp = Invoke-RestMethod -Uri "$baseUrl/departments" -Method Post -Body $deptPayload -ContentType "application/json"
$deptId = $deptResp.id
Write-Host "[1/8] Created Department: ID=$deptId, Name=$($deptResp.name)" -ForegroundColor Green

# 2. Create Employee linked to Department
$empCode = "VERIF$(Get-Random -Minimum 1000 -Maximum 9999)"
$empPayload = @{
    employeeId = $empCode
    name = "Dr. Michael Chen"
    email = "michael.$($empCode.ToLower())@company.com"
    phone = "9876543210"
    designation = "Lead Reliability Engineer"
    joiningDate = "2025-05-15"
    departmentId = $deptId
} | ConvertTo-Json
$empResp = Invoke-RestMethod -Uri "$baseUrl/employees" -Method Post -Body $empPayload -ContentType "application/json"
$empId = $empResp.id
Write-Host "[2/8] Created Employee: ID=$empId, Code=$($empResp.employeeId), Name=$($empResp.name), Dept=$($empResp.department.name)" -ForegroundColor Green

# 3. Create Leave Type
$ltPayload = @{
    name = "Audit Sabbatical $(Get-Random -Minimum 100 -Maximum 999)"
    defaultDays = 10
    description = "Special leave for comprehensive audit and verification"
} | ConvertTo-Json
$ltResp = Invoke-RestMethod -Uri "$baseUrl/leave-types" -Method Post -Body $ltPayload -ContentType "application/json"
$ltId = $ltResp.id
Write-Host "[3/8] Created Leave Type: ID=$ltId, Name=$($ltResp.name), Days=$($ltResp.defaultDays)" -ForegroundColor Green

# 4. Apply Leave
$leave1Payload = @{
    employeeId = $empId
    leaveTypeId = $ltId
    startDate = "2026-11-10"
    endDate = "2026-11-14"
    reason = "Phase 14 End-to-End System Audit Verification"
} | ConvertTo-Json
$leave1 = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Body $leave1Payload -ContentType "application/json"
$leave1Id = $leave1.id
Write-Host "[4/8] Applied Leave #1: ID=$leave1Id, Status=$($leave1.status), Dates=$($leave1.startDate) to $($leave1.endDate)" -ForegroundColor Green

# 5. Verify PENDING status
if ($leave1.status -ne "PENDING") {
    throw "Expected status PENDING but got $($leave1.status)"
}
Write-Host "[5/8] Verified Leave #1 is PENDING" -ForegroundColor Green

# 6. Test Workflow Transitions (Approve, Reject, Cancel)
# 6a. Approve Leave #1
$approvedLeave1 = Invoke-RestMethod -Uri "$baseUrl/leaves/$leave1Id/approve" -Method Put
if ($approvedLeave1.status -ne "APPROVED") {
    throw "Expected status APPROVED but got $($approvedLeave1.status)"
}
Write-Host "[6a/8] Approved Leave #1: Status=$($approvedLeave1.status)" -ForegroundColor Green

# 6b. Apply and Reject Leave #2
$leave2Payload = @{
    employeeId = $empId
    leaveTypeId = $ltId
    startDate = "2026-11-20"
    endDate = "2026-11-22"
    reason = "Leave #2 for rejection testing"
} | ConvertTo-Json
$leave2 = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Body $leave2Payload -ContentType "application/json"
$rejectedLeave2 = Invoke-RestMethod -Uri "$baseUrl/leaves/$($leave2.id)/reject" -Method Put
if ($rejectedLeave2.status -ne "REJECTED") {
    throw "Expected status REJECTED but got $($rejectedLeave2.status)"
}
Write-Host "[6b/8] Created and Rejected Leave #2 (ID=$($leave2.id)): Status=$($rejectedLeave2.status)" -ForegroundColor Green

# 6c. Apply and Cancel Leave #3
$leave3Payload = @{
    employeeId = $empId
    leaveTypeId = $ltId
    startDate = "2026-12-01"
    endDate = "2026-12-03"
    reason = "Leave #3 for cancellation testing"
} | ConvertTo-Json
$leave3 = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Body $leave3Payload -ContentType "application/json"
$cancelledLeave3 = Invoke-RestMethod -Uri "$baseUrl/leaves/$($leave3.id)/cancel" -Method Put
if ($cancelledLeave3.status -ne "CANCELLED") {
    throw "Expected status CANCELLED but got $($cancelledLeave3.status)"
}
Write-Host "[6c/8] Created and Cancelled Leave #3 (ID=$($leave3.id)): Status=$($cancelledLeave3.status)" -ForegroundColor Green

# 6d. Apply a fresh PENDING Leave #4
$leave4Payload = @{
    employeeId = $empId
    leaveTypeId = $ltId
    startDate = "2026-12-15"
    endDate = "2026-12-18"
    reason = "Leave #4 active PENDING request for UI review"
} | ConvertTo-Json
$leave4 = Invoke-RestMethod -Uri "$baseUrl/leaves" -Method Post -Body $leave4Payload -ContentType "application/json"
Write-Host "[6d/8] Created Leave #4 (ID=$($leave4.id)): Status=$($leave4.status)" -ForegroundColor Green

# Summary check
Write-Host "`nAll End-To-End API steps completed successfully!" -ForegroundColor Cyan
Write-Host "Created Resources: Dept=$deptId, Emp=$empId ($empCode), LeaveType=$ltId, Leaves=[$leave1Id, $($leave2.id), $($leave3.id), $($leave4.id)]" -ForegroundColor White
