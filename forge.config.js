module.exports = {
  packagerConfig: {
    name: 'Claude Pop',
    executableName: 'claude-pop',
    icon: './assets/icon',
    appBundleId: 'com.mateusdeve.claude-pop',
    asar: true,
    ignore: [
      /^\/src$/,
      /^\/tsconfig/,
      /^\/webpack/,
      /^\/\.git/,
      /^\/\.gitignore/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Claude Pop',
        format: 'ULFO',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
  ],
};
