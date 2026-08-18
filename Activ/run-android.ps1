# Add Android SDK tools to PATH for this session
$env:Path += ";C:\Users\thami\AppData\Local\Android\Sdk\platform-tools"
$env:Path += ";C:\Users\thami\AppData\Local\Android\Sdk\emulator"

Write-Host "Starting React Native Android app..." -ForegroundColor Green
npx react-native run-android
