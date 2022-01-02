/**
 * =============================================================
 * This is a parser for the .mc files
 * @package helpers/Parser.ts
 * @author DreamTeam
 * =============================================================
 */
import fs from 'fs'

type ObjectAlias = object;
export interface ObjectOfStrings extends ObjectAlias {
    [key: string]: string
}

export const parseHelper = (file_path: string) => {
    let section: string = '.text'
    let address: string | null = null
    const contents: string[] = fs.readFileSync(file_path, { flag: 'r', encoding: 'utf-8' }).split('\n')

    const instructions: ObjectOfStrings = {}
    const data: ObjectOfStrings = {}

    for (const content of contents) {
        if (content.includes('.data')) {
            section = '.data'
        }

        const sub = content.split(':')
        if (sub.length === 2 && sub[1] !== '') { // We have a valid set of instructions formated as address: instruction
            const information = sub[1].replace('\t', '').trim()
            if (section === '.text') {
                instructions[sub[0]] = information
            }
            else {
                if (parseInt(sub[0], 16) - parseInt(<string>address, 16) === 2 && address !== null) {
                    data[address] = data[address] + information
                }
                else {
                    data[sub[0]] = information
                    address = sub[0]
                }
            }
        }
    }

    return [instructions, data]
}