import * as dotenv from 'dotenv'
dotenv.config()

import path from 'path'
import Memory from './core/Memory'
import Processor from './core/Processor'
import { parseHelper } from './helpers/Parser'

const memory: Memory = Memory.instance()
const processor: Processor = Processor.instance()
const files: Array<string> = [
    path.join(__dirname, '/mc/rv32ui-v-addi.mc'),
    path.join(__dirname, '/mc/rv32ui-v-beq.mc'),
    path.join(__dirname, '/mc/rv32ui-v-lw.mc'),
    path.join(__dirname, '/mc/rv32ui-v-srl.mc'),
    path.join(__dirname, '/mc/rv32ui-v-sw.mc'),
    path.join(__dirname, '/mc/rv32ui-v-xor.mc'),
    path.join(__dirname, '/mc/rv32um-v-rem.mc'),
]

for (const file of files) {
    const [instructions, data] = parseHelper(file)

    memory.resetStack()
    memory.loadInstructions(instructions)
    memory.loadData(data)

    console.warn(`Executing file: ${file}`)
    processor.run()
}

