import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '..')
const backendDir = path.join(workspaceRoot, 'backend')
const backendEntry = path.join(backendDir, 'server.js')
const backendHealthUrl = 'http://127.0.0.1:5000/api/health'
const backendOutLog = path.join(workspaceRoot, 'backend-run.log')
const backendErrLog = path.join(workspaceRoot, 'backend-run.err.log')

let backendProcess
let startupPromise

const checkBackendHealth = () =>
  new Promise((resolve) => {
    const req = http.get(backendHealthUrl, (res) => {
      resolve(res.statusCode === 200)
      res.resume()
    })

    req.setTimeout(1000, () => {
      req.destroy()
      resolve(false)
    })

    req.on('error', () => resolve(false))
  })

const waitForBackend = async (retries = 20) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (await checkBackendHealth()) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  return false
}

function ensureBackendRunning() {
  if (startupPromise) {
    return startupPromise
  }

  startupPromise = (async () => {
    if (await checkBackendHealth()) {
      return true
    }

    const outFd = fs.openSync(backendOutLog, 'a')
    const errFd = fs.openSync(backendErrLog, 'a')

    backendProcess = spawn(process.execPath, [backendEntry], {
      cwd: backendDir,
      env: process.env,
      stdio: ['ignore', outFd, errFd],
      windowsHide: false,
    })

    backendProcess.on('exit', () => {
      backendProcess = undefined
      startupPromise = undefined
    })

    return waitForBackend()
  })()

  return startupPromise
}

function pressKarduBackendPlugin() {
  return {
    name: 'presskardu-backend-autostart',
    async configureServer(server) {
      const healthy = await ensureBackendRunning()

      if (healthy) {
        server.config.logger.info('backend ready on http://127.0.0.1:5000', {
          timestamp: true,
        })
      } else {
        server.config.logger.warn(
          'backend auto-started but health check is still failing; inspect backend-run.err.log',
          { timestamp: true },
        )
      }

      server.httpServer?.once('close', () => {
        if (backendProcess && !backendProcess.killed) {
          backendProcess.kill()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), pressKarduBackendPlugin()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        // Use IPv4 loopback explicitly so Vite doesn't bounce between ::1/127.0.0.1
        // when the backend is only reachable on IPv4.
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
})
