/**
 * "Start with the computer". Electron's login items cover Windows and macOS;
 * on Linux the desktop's autostart folder (~/.config/autostart) does the job.
 */
import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'

/** Quotes a path for a .desktop Exec line (spaces, quotes, $ and backslashes). */
export function desktopExec(path: string): string {
  return `"${path.replace(/(["`$\\])/g, '\\$1')}"`
}

export async function setLaunchOnStartup(on: boolean): Promise<void> {
  if (process.platform !== 'linux') {
    app.setLoginItemSettings({ openAtLogin: on })
    return
  }
  const file = join(app.getPath('appData'), 'autostart', 'cannon-vtt.desktop')
  if (!on) {
    await fs.rm(file, { force: true })
    return
  }
  // An AppImage runs from a temporary mount; APPIMAGE is the file itself.
  const exe = process.env['APPIMAGE'] || process.execPath
  await fs.mkdir(dirname(file), { recursive: true })
  await fs.writeFile(
    file,
    ['[Desktop Entry]', 'Type=Application', 'Name=Cannon VTT', `Exec=${desktopExec(exe)}`, 'Icon=cannon-vtt', 'Terminal=false', 'X-GNOME-Autostart-enabled=true', ''].join('\n')
  )
}
