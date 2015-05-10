/**
 * An assembler for the 6502
 */
(function (w) {
    "use strict";

    w.JNE = w.JNE || {};

    /**
     * @param cpu JNE.CPU The 6502 CPU
     * @constructor
     */
    var Assembler = function (cpu) {
        this.cpu = cpu;
    };

    Assembler.prototype.AssemblerError = function (message) {
        this.name = 'AssemblerError';
        this.message = message;
        this.stack = (new Error()).stack;
    };
    Assembler.prototype.AssemblerError.prototype = new Error();
    Assembler.prototype.AssemblerError.prototype.constructor = Assembler.prototype.AssemblerError;

    Assembler.prototype.assembleLine = function (code, lineNo) {
        code = code.replace(/^\s+|\s+$/gm,''); //trim
        code = code.replace(/;.*/, '');
        code = code.replace(/[\r\n]*/, '');
        code = code.toUpperCase();
        var parts = code.split(/\s+/, 2);
        var operator = parts[0];

        if(!(operator in this.cpu.opcodes)){
            throw new this.AssemblerError('Unknown operator "' + operator + '"');
        }


        var addressData = this.getAddressData(parts);

        // @todo Add other memory addressing modes to above IF

        var bytes = [];

        for(var opcode in this.cpu.instruction_table){
            if(this.cpu.instruction_table[opcode][0] === this.cpu.opcodes[operator] && this.cpu.instruction_table[opcode][1] === addressData.addressMode){
                bytes.push(parseInt(opcode,10));
                break;
            }
        }

        if(bytes.length === 0){
            throw new this.AssemblerError('Invalid memory address mode for operator ' + operator + ' on line ' + lineNo);
        }

        bytes.push.apply(bytes, addressData.memoryAddressBytes);
        return bytes;
    };

    Assembler.prototype.getAddressData = function(parts){

        var data = {};

        var matches;

        var indirectRegex = /\(\s*\$([0-9A-F]+)\s*\)/;
        var indexedRegex = /\$([0-9A-F]+)\s*,\s*([XY])/;
        var indexedIndirectRegex = /\(\s*\$([0-9A-F]+)\s*,\s*X\s*\)/;
        var indirectIndexedRegex = /\(\s*\$([0-9A-F]+)\s*\)\s*,\s*Y/;

        // @todo Absolute indexed and relative

        if(parts.length === 1) {
            data.addressMode = this.cpu.addressModes.IMPLICIT;
            data.memoryAddressBytes = [];
        }else if(parts[1].substring(0,1) === '#'){
            data.addressMode = this.cpu.addressModes.IMMEDIATE;
            data.memoryAddressBytes = this.parseHexToByteArray(parts[1].substring(1));
        }else if(parts[1].substring(0,1) === 'A'){
            data.addressMode = this.cpu.addressModes.ACCUMULATOR;
            data.memoryAddressBytes = [];
        }else if((matches = parts[1].match(indirectRegex)) !== null){
            var indirect = matches[1];
            data.addressMode = this.cpu.addressModes.INDIRECT_ABSOLUTE;
            data.memoryAddressBytes = this.parseHexToByteArray(indirect);
        }else if((matches = parts[1].match(indirectIndexedRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDIRECT_INDEXED;
            data.memoryAddressBytes = this.parseHexToByteArray(matches[1]);
        }else if((matches = parts[1].match(indexedIndirectRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDEXED_INDIRECT;
            data.memoryAddressBytes = this.parseHexToByteArray(matches[1]);
        }else if((matches = parts[1].match(indexedRegex)) !== null){ // (ABSOLUTE|ZEROPAGE) INDEXED
            var indexed = matches[1];
            var offset = matches[2];

            data.memoryAddressBytes = this.parseHexToByteArray(indexed);

            if(data.memoryAddressBytes.length === 1){
                if(offset === 'X'){
                    data.addressMode = this.cpu.addressModes.ZERO_PAGE_X;
                }else if(offset === 'Y'){
                    data.addressMode = this.cpu.addressModes.ZERO_PAGE_Y;
                }
            }else if(data.memoryAddressBytes.length === 2){
                if(offset === 'X') {
                    data.addressMode = this.cpu.addressModes.ABSOLUTE_X;
                }else if(offset === 'Y'){
                    data.addressMode = this.cpu.addressModes.ABSOLUTE_Y;
                }
            }else{
                throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
            }

        }else if(parts[1].substring(0,1) === '$'){

            data.memoryAddressBytes = this.parseHexToByteArray(parts[1].substring(1));

            if(data.memoryAddressBytes.length === 1){
                data.addressMode = this.cpu.addressModes.ZERO_PAGE;
            }else if(data.memoryAddressBytes.length === 2){
                data.addressMode = this.cpu.addressModes.ABSOLUTE;
            }else{
                throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
            }
        }else{
            throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
        }

        return data;
    };

    Assembler.prototype.assemble = function (code) {
        var lines = code.split(/\n/);
        var assembled = [];
        for(var i in lines){
            assembled.push.apply(assembled, this.assembleLine(lines[i], i));
        }
        return assembled;
    };

    Assembler.prototype.parseHexToByteArray = function(hex){

        var bytes = [];

        if(hex.substring(0,1) === '$') {
            hex = hex.substring(1);
        }

        hex = hex.replace(/^0+/, '');

        if(hex.length % 2 === 1){
            hex = '0' + hex;
        }

        var hexes = hex.match(/.{2}/g);

        for(var i = hexes.length - 1; i >= 0; i--){
            bytes.push(parseInt(hexes[i], 16));
        }

        return bytes;
    };

    w.JNE.Assembler = Assembler;

})(window);
