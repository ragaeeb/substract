# substract

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/d80dde71-b060-4c64-9008-aae725f33436.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/d80dde71-b060-4c64-9008-aae725f33436)
[![E2E](https://github.com/ragaeeb/substract/actions/workflows/e2e.yml/badge.svg)](https://github.com/ragaeeb/substract/actions/workflows/e2e.yml)
[![Node.js CI](https://github.com/ragaeeb/substract/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/substract/actions/workflows/build.yml)
![GitHub License](https://img.shields.io/github/license/ragaeeb/substract)
![GitHub Release](https://img.shields.io/github/v/release/ragaeeb/substract)
[![codecov](https://codecov.io/gh/ragaeeb/substract/graph/badge.svg?token=86P2IF7F3Y)](https://codecov.io/gh/ragaeeb/substract)
[![Size](https://deno.bundlejs.com/badge?q=substract@1.0.0&badge=detailed)](https://bundlejs.com/?q=substract%401.0.0)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)

`substract` is a NodeJS library for extracting hard-coded subtitles from within videos.

## Installation

```bash
npm install substract
```

or

```bash
pnpm install substract
```

or

```bash
yarn add substract
```

## Usage

### Basic Example

```javascript
import { substract } from 'substract';

const outputFile = await substract('https://your-domain.com/path/to/media.mp4'); // path to JSON of transcription
```

## Contributing

Contributions are welcome! Please make sure your contributions adhere to the coding standards and are accompanied by relevant tests.

## License

`substract` is released under the MIT License. See the LICENSE file for more details.
