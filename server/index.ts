import { startMarketingScheduler } from './marketing/scheduler.js'
import { createApp } from './app.js'
const PORT = process.env.PORT || 3001

const app = createApp()

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 API available at http://localhost:${PORT}/api`)
  startMarketingScheduler()
})
