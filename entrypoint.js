// Import required polyfills first
import 'fast-text-encoding';
//first
import 'react-native-get-random-values';
//buffer 
import { Buffer } from 'buffer';
global.Buffer = Buffer;
//second
import '@ethersproject/shims';

// Then import the expo router entrypoint
import 'expo-router/entry';

// Note: keep this file minimal and imported as the app "main" in package.json.
