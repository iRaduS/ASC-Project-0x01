/**
 * =============================================================
 * Memory Class for the RISC-V machine
 * @package core/Processor.ts
 * @author DreamTeam
 * =============================================================
 */
import registers from './../helpers/data/registers.json'
import formats from './../helpers/data/formats.json'
import Memory from './Memory'

const memory = new Memory()

export default class Processor {
    public regs: typeof registers = registers
    public fmt: typeof formats = formats

    public run() {
        while (true) {
            if (this.fmt.err) {
                break;
            }

            this.fmt = formats

            this.fetchInstruction()
        }
    }

    public fetchInstruction() {
        this.fmt.inst = memory.getDataStack(this.regs.pc)
    }
}