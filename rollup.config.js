import resolve from "rollup-plugin-node-resolve";
import buble from "rollup-plugin-buble";
import uglify from "rollup-plugin-uglify";
import serve from "rollup-plugin-serve";

const production = !process.env.ROLLUP_WATCH;

export default {
    input: "js/main.js",
    output: {
        name: "main",
        sourcemap: !production && true,
        file: "js/bundle.js",
        format: "iife",
    },
    plugins: [
        resolve(),
        !production && serve({
            contentBase: "",
            port: 4000
        }),
        production && buble(),
        production && uglify()
    ]
};
