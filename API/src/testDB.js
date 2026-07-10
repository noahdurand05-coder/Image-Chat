const { connectDB } = require("./db");

async function test() {

    await connectDB();

}

test();