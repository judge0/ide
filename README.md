# Judge0 IDE
[![Judge0 IDE Screenshot](https://github.com/judge0/ide/blob/master/.github/screenshot.png?raw=true)](https://ide.judge0.com/?7U55)

[![License](https://img.shields.io/github/license/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/blob/master/LICENSE)
[![Release](https://img.shields.io/github/v/release/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/releases)
[![Stars](https://img.shields.io/github/stars/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/stargazers)

<a href="https://www.producthunt.com/posts/judge0-ide" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=179885&theme=light" alt="" height="43px" /></a>

## Quickstart

Judge0 IDE up and running quickly:

1. **Setting Host and Port** 
    To ensure Judge0 IDE connects to the correct backend host, configure the `defaultUrl` in `ide/js` based on your environment:

    - **Local Setup**: If running Judge0 IDE locally, set `defaultUrl` to `localhost:port`.
    - **Remote Setup**: If deploying to a remote server, set `defaultUrl` to your server's address, e.g., `remote:port`.

    Adjusting this setting will allow the IDE to connect properly depending on whether it is running locally or remotely.

2. **Start Judge0 IDE** 
    ```bash
    docker-compose up -d db redis
    sleep 10s
    docker-compose up -d
    sleep 5s
    ```

By default, the IDE web interface will open on port 8085. You can change this in `docker-compose.yml`. If you modify the port or host for Nginx, remember to also update the `defaultUrl` in `ide/js`.

## About
[**Judge0 IDE**](https://ide.judge0.com) is a free and open-source online code editor that allows you to write and execute code from a rich set of languages. It's perfect for anybody who just wants to quickly write and run some code without opening a full-featured IDE on their computer. Moreover, it is also useful for teaching and learning or just trying out a new language.

Judge0 IDE is using [**Judge0**](https://ce.judge0.com) for executing the user's source code.

Visit https://ide.judge0.com, and enjoy happy coding. :)

## Community
Do you have a question, feature request, or something else on your mind? Or do you want to follow Judge0 news?

* [Subscribe to Judge0 newsletter](https://subscribe.judge0.com)
* [Join our Discord server](https://discord.gg/GRc3v6n)
* [Watch asciicasts](https://asciinema.org/~hermanzdosilovic)
* [Report an issue](https://github.com/judge0/judge0/issues/new)
* [Contact us](mailto:contact@judge0.com)
* [Schedule an online meeting with us](https://meet.judge0.com)

## Author and Contributors
Judge0 IDE was created by [Herman Zvonimir Došilović](https://github.com/hermanzdosilovic).

Thanks a lot to all [contributors](https://github.com/judge0/ide/graphs/contributors) for their contributions to this project.

## License
Judge0 IDE is licensed under the [MIT License](https://github.com/judge0/ide/blob/master/LICENSE).
