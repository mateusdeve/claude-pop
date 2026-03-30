module.exports = {
  packagerConfig: {
    name: 'Claude Pop',
    executableName: 'claude-pop',
    icon: './assets/icon',
    appBundleId: 'com.mateusdeve.claude-pop',
    asar: true,
    osxSign: {},
    ignore: [
      /^\/src$/,
      /^\/tsconfig/,
      /^\/webpack/,
      /^\/\.git/,
      /^\/\.gitignore/,
    ],
  },
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'mateusdeve',
          name: 'claude-pop',
        },
        prerelease: false,
        draft: false,
      },
    },
  ],
  makers: [
    // macOS
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Claude Pop',
        format: 'ULFO',
      },
    },
    // macOS + Linux zip
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
    // Windows (.exe installer)
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ClaudePop',
        setupExe: 'Claude Pop Setup.exe',
      },
    },
    // Linux .deb (Ubuntu/Debian)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'claude-pop',
          productName: 'Claude Pop',
          genericName: 'Claude Code Overlay',
          description: 'Floating overlay for Claude Code — permissions, questions, session switching from a global hotkey',
          categories: ['Development', 'Utility'],
          icon: './assets/icon.png',
        },
      },
    },
    // Linux .rpm (Fedora/RHEL)
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          name: 'claude-pop',
          productName: 'Claude Pop',
          description: 'Floating overlay for Claude Code',
          icon: './assets/icon.png',
        },
      },
    },
  ],
};
