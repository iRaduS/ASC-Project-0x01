/**
 * =============================================================
 * Memory Class for the RISC-V machine
 * @package core/Memory.ts
 * @author DreamTeam
 * =============================================================
 */
import { ObjectOfStrings } from '../helpers/Parser'

export default class Memory {
    private _stack: Array<number> = []
    private _offset: number = 0
    private static singleton: Memory;

    public static instance(): Memory {
        if (!Memory.singleton) {
            Memory.singleton = new Memory()
        }

        return Memory.singleton
    }

    /**
     * Reset the stack offset with a null integer value
     */
    public resetOffset(): void  {
        this._offset = 0
    }

    /**
     * Reset the stack with an empty value
     */
    public resetStack(): void {
        this._stack = []
    }

    /**
     * Get the data from the current stack
     *
     * @param address
     */
    public getDataStack(address: number): number {
        return this._stack[address] || 0
    }

    /**
     * Write the data to the stack at the indicated address
     *
     * @param address
     * @param data
     */
    public setDataStack(address: number, data: number): void {
        const overflow_check: boolean = (address - this._stack.length) > 0

        if (overflow_check) {
            this._stack.concat(
                new Array(address - this._stack.length).fill(0)
            )
        }

        this._stack[address] = data | 0
    }

    /**
     * Load all the instructions inside the stack memory
     *
     * @param data
     */
    public loadInstructions(data: ObjectOfStrings): void {
        if (Object.keys(data).length) {
            const size: number = parseInt(Object.keys(data)[Object.keys(data).length - 1], 16) - parseInt(Object.keys(data)[0], 16)

            this._stack = new Array(size + 16).fill(0)
            this._offset = parseInt(Object.keys(data)[0], 16)

            for (const key in data) {
                this._stack[parseInt(key, 16) - this._offset] = parseInt(data[key], 16)
            }
        }
    }

    /**
     * Load all the data inside the stack memory (data comes after the instructions)
     *
     * @param data
     */
    public loadData(data: ObjectOfStrings): void {
        if (Object.keys(data).length) {
            const size: number = parseInt(Object.keys(data)[Object.keys(data).length - 1], 16) - (this._stack.length + this._offset)

            this._stack.concat(
                new Array(size + 1).fill(0)
            )

            for (const key in data) {
                this._stack[parseInt(key, 16) - this._offset] = parseInt(data[key], 16)
            }
        }
    }
}