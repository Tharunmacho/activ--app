$paths = @("C:\Users\tharu\AppData\Local\Android\Sdk", "C:\AndroidDev", "C:\Android", "M:\AndroidDev\sdk")
foreach ($p in $paths) {
    if (Test-Path $p) {
        $files = Get-ChildItem $p -Recurse -File -ErrorAction SilentlyContinue
        $size = ($files | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "$p EXISTS : $($size.ToString('N2')) GB"
    } else {
        Write-Host "$p NOT FOUND"
    }
}
