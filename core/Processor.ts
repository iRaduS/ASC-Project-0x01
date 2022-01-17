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
import _ from 'lodash'

const memory = Memory.instance()

export default class Processor {
    public regs: any = registers
    public fmt: any = formats
    private static singleton: Processor

    private getReg(id: number) {
        return ([...Object.keys(this.regs)])[id];
    }

    private twosComp(twosComplement: number, numberBytes: number)
    {
        let numberBits = (numberBytes || 1) * 8;

        if (twosComplement <= Math.pow(2, numberBits - 1) - 1)
            return twosComplement;

        return -(((~twosComplement) & ((1 << numberBits) - 1)) + 1);
    }


    public static instance(): Processor {
        if (!Processor.singleton) {
            Processor.singleton = new Processor()
        }

        return Processor.singleton
    }

    public run() {
        this.resetRegisters()
        this.resetFormats()

        while (!this.fmt.err) {
            this.resetFormats()

            // Cycle representation -> IF ID EX MEM WB
            // Check 0x06 course by C. Rusu (https://cs.unibuc.ro/~crusu/asc)

            this.fetchInstruction()
            this.decodeInstruction()
            this.executeInstruction()

            // ciclii MEM (@getDataStack -> class<Memory>) si WB (@setDataStack -> class<Memory>) se va face la nivelul lui EX (@executeInstruction -> class<Processor>)

        }
    }

    /**
     * Reset all the registers
     */
    public resetRegisters() {
        Object.keys(this.regs).forEach((i) => this.regs[i] = 0)
    }

    /**
     * Reset all the formats
     */
    public resetFormats() {
        Object.keys(this.fmt).forEach((i) => this.fmt[i] = 0)
        this.fmt.err = false
    }

    public fetchInstruction() {
        this.fmt.inst = memory.getDataStack(this.regs.pc)

        if (process.env.DEBUG_MODE_PROJECT === 'true' && this.fmt.inst !== 0) {
            console.log(JSON.stringify(this.regs))
            console.log(`[Fetch] Instr: ${this.fmt.inst}(${this.fmt.inst.toString(16)}) | Addr: 0x${(this.fmt.inst + 0x80000000).toString(16)}`)
        }
    }

    public decodeInstruction() {
        const repr: string = this.fmt.inst.toString(2).padStart(32, '0')
        this.fmt.opcode = parseInt(repr.slice(repr.length - 7, repr.length), 2)

        if (process.env.DEBUG_MODE_PROJECT === 'true' && this.fmt.inst !== 0) {
            console.log(`[Decode] Opcode: ${this.fmt.opcode}(bin: ${this.fmt.opcode.toString(2)})`)
        }
        const currInstruction: number = this.fmt.inst

        switch (this.fmt.opcode) {
            case 115: {
                // End of program (a0 = 1 => pass)
                console.log(`${this.regs.a0 == 1 ? 'pass' : 'fail'}`)
                this.fmt.err = true

                break
            }

            case 51: {
                // R-Type instruction
                this.fmt = {
                    ...this.fmt,

                    f3: (currInstruction & 0x7000) >> 12,
                    rs1: (currInstruction & 0xF8000) >> 15,
                    rs2: (currInstruction & 0xFFF00000) >> 20,
                    rd: (currInstruction & 0xF80) >> 7
                }

                break
            }

            case 55:
            case 23: {
                // U-Type (auipc / lui)
                this.fmt = {
                    ...this.fmt,

                    imm: (currInstruction & 0xFFFFF000) >> 12,
                    rd: (currInstruction & 0xF80) >> 7
                }

                break
            }

            case 3:
            case 19: {
                // I-Type
                const twoComplementImm = (currInstruction & 0xFFF00000) >> 0x14

                this.fmt = {
                    ...this.fmt,

                    f3: (currInstruction & 0x7000) >> 12,
                    rd: (currInstruction & 0xF80) >> 7,
                    rs1: (currInstruction & 0xF8000) >> 15,
                    imm: (twoComplementImm & 0x7ff) - (twoComplementImm & 0x800)
                }

                break
            }

            case 111: {
                // J-Type
                const computeImm: string = _.reverse([...(_.slice([...repr], 1, 11).reverse().join('') + repr[11]
                    + _.slice([...repr], 12, 20).reverse().join('') + repr[0])]).join('')

                const complement: boolean = computeImm[0] === '1'

                let off: number = parseInt(computeImm, 2)
                if (complement) {
                    off -= (1 << 19)
                    off = -off
                }
                off <<= 1

                this.fmt = {
                    ...this.fmt,
                    imm: off
                }

                break
            }

            case 35: {
                // S-Type
                let computeImm: number = parseInt(_.reverse([...(_.slice([...repr], 20, 25).reverse().join('') +
                    _.slice([...repr], 1, 7).reverse().join(''))])
                    .join(''), 2) | 0

                computeImm = this.twosComp(computeImm, 1)

                this.fmt = {
                    ...this.fmt,
                    f3: (currInstruction & 0x7000) >> 12,
                    rs1: (currInstruction & 0xF8000) >> 15,
                    rs2: (currInstruction & 0x1F00000) >> 20,
                    imm: computeImm
                }

                break
            }

            case 99: {
                // BNE (B-Type)
                let computeImm: number = parseInt(_.reverse([...(_.slice([...repr], 20, 24).reverse().join('')
                    + _.slice([...repr], 1, 7).reverse().join('')
                    + repr[24] + repr[0])]).join(''), 2)

                computeImm = (computeImm & 0x7FF) - (computeImm & 0x800)

                this.fmt = {
                    ...this.fmt,
                    rs1: (currInstruction & 0xF8000) >> 15,
                    rs2: (currInstruction & 0x1F00000) >> 20,
                    f3: (currInstruction & 0x7000) >> 12,
                    imm: computeImm
                }

                break
            }
            default: {
                break
            }
        }
    }

    public executeInstruction() {
        switch (this.fmt.opcode) {
            case 111: {
                this.regs.pc += this.fmt.imm

                break
            }
            case 19: {
                if (this.fmt.f3 === 0) {
                    // ADDI
                    const key: any = this.getReg(this.fmt.rd)

                    if (key != 'zero') {
                        this.regs[key] = (this.regs[this.getReg(this.fmt.rs1)] + this.fmt.imm) & 0xFFFFFFFF
                        this.regs[key] |= 0
                    }
                } else if (this.fmt.f3 === 1) {
                    // SLLI
                    const key: any = this.getReg(this.fmt.rd)

                    if (key != 'zero') {
                        this.regs[key] = ((this.regs[this.getReg(this.fmt.rs1)] << (this.fmt.imm & 0x1F)) & 0xFFFFFFFF)
                    }
                } else if (this.fmt.f3 === 6) {
                    // ORI
                    const key: any = this.getReg(this.fmt.rd)

                    if (key != 'zero') {
                        this.regs[key] = this.regs[this.getReg(this.fmt.rs1)] | this.fmt.imm
                    }
                }

                this.regs.pc += 4
                break
            }
            case 51: {
                if (this.fmt.f3 === 4) {
                    const key = this.getReg(this.fmt.rd)

                    if (key != 'zero') {
                        this.regs[key] = this.regs[this.getReg(this.fmt.rs1)] ^ this.regs[this.getReg(this.fmt.rs2)]
                    }
                }
                this.regs.pc += 4
                break
            }
            case 3: {
                if (this.fmt.f3 === 2) {
                    let addr: number = memory.getDataStack(this.fmt.imm + this.regs[this.getReg(this.fmt.rs1)])
                    addr |= 0

                    const key: any = this.getReg(this.fmt.rd)
                    if (key != 'zero') {
                        this.regs[key] = addr
                    }
                }

                this.regs.pc += 4
                break
            }
            case 35: {
                if (this.fmt.f3 === 2) {
                    const addr: number = this.fmt.imm + this.regs[this.getReg(this.fmt.rs1)]
                    let val: number = this.regs[this.getReg(this.fmt.rs2)] >>> 0

                    if (val < 0) {
                        val += (1 << 32)
                    }

                    memory.setDataStack(addr, val)
                }

                this.regs.pc += 4
                break
            }
            case 55: {
                // LUI
                const key: any = this.getReg(this.fmt.rd)

                if (key != 'zero') {
                    this.regs[key] = (this.fmt.imm << 12)
                    this.regs[key] |= 0
                }

                this.regs.pc += 4
                break
            }
            case 23: {
                // AUIPC
                const key: any = this.getReg(this.fmt.rd)

                if (key != 'zero') {
                    this.regs[key] = (this.fmt.imm << 12) + this.regs.pc
                }

                this.regs.pc += 4
                break
            }
            case 99: {
                // B-Type
                if (this.fmt.f3 === 0) {
                    // BEQ
                    if (this.regs[this.getReg(this.fmt.rs1)] == this.regs[this.getReg(this.fmt.rs2)]) {
                        this.regs.pc += (this.fmt.imm * 2)
                    } else {
                        this.regs.pc += 4
                    }
                } else if (this.fmt.f3 === 1) {
                    // BNE
                    if (this.regs[this.getReg(this.fmt.rs1)] != this.regs[this.getReg(this.fmt.rs2)]) {
                        this.regs.pc += (this.fmt.imm * 2)
                    } else {
                        this.regs.pc += 4
                    }
                }

                break
            }
            default: {
                this.regs.pc += 4

                break
            }
        }
    }
}