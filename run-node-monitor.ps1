
Write-Host "Node.js Dependency Monitor Helper" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host ""
Write-Host "To monitor Node.js dependencies, run your app with:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    $env:NODE_OPTIONS='--require ./nodeMonitor.js'" -ForegroundColor Yellow
Write-Host "    node your-app.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or simply run:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    node -r ./nodeMonitor.js your-app.js" -ForegroundColor Yellow
Write-Host ""

# For React applications
Write-Host "For React applications:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    node -r ./nodeMonitor.js node_modules/.bin/react-scripts start" -ForegroundColor Yellow
Write-Host ""
