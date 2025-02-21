## iOS Build Issues

### Metro Bundler Not Loading / Blank Screen Issues

If you encounter issues where Metro shows "Loading" and then displays a blank screen, or if the iOS build is failing with pod dependency conflicts, follow these steps:

1. Clean all pod caches and reinstall:
```bash
cd ios
pod deintegrate
pod cache clean --all
cd ..
```

2. Regenerate native code:
```bash
npx expo prebuild -p ios --clean
```

3. Start the development build:
```bash
npx expo start --clear
```

### Common Issues and Solutions

- **Pod Dependency Conflicts**: If you see errors about incompatible pod versions or dependency conflicts, the above steps should resolve them by clearing the pod cache and getting a fresh install.
- **Metro Bundler Issues**: If Metro isn't connecting properly, the `--clear` flag when starting expo helps rebuild the JavaScript bundle from scratch.

### Why This Works

The solution works because it:
1. Removes all cached CocoaPods that might have conflicting versions
2. Forces a clean reinstall of all native dependencies
3. Regenerates the native code with current configurations
4. Ensures a fresh Metro bundler instance

Remember to commit your changes before running these commands, as they will modify native files. 