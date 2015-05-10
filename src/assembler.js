/**
 * An assembler for the 6502.
 *
 * Kind of hacked together, and not as carefully unit tested as the actual NES components.
 *
 * This is really only here as a debugging tool.
 *
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

    Assembler.prototype.resolveLabels = function(segmentGroups){

        var segmentGroup;
        var changes = 0;
        var value;
        var oldSize;
        var newAddressMode;

        var newIns;
        var lastGroup = null;

        for(var i =0; i < segmentGroups.length; i++) {

            segmentGroup = segmentGroups[i];

            if(lastGroup !== null) {
                segmentGroup.offset = lastGroup.offset;
                segmentGroup.offset += lastGroup.size;
            }

            if (segmentGroup.memorySegment.type === this.segmentTypes.LABEL) {
                value = this.getLabelValue(segmentGroup.memorySegment.labelName, segmentGroups);

                oldSize = segmentGroup.memorySegment.size;

                if(segmentGroup.instructionSegment.isBranch){

                    value = value - (segmentGroup.offset + segmentGroup.size);

                    // -128 to 127
                    if(value < -128 || value > 127){
                        //throw new this.AssemblerError("Attempted to branch to label " + segmentGroup.memorySegment.labelName + ", but it is too far.");
                    }

                    value = value & 0xff;

                    oldSize = 1;
                }

                var hiByte = (value >> 8) & 0xff;
                var loByte = value & 0xff;

                segmentGroup.memorySegment.size = hiByte > 0 ? 2 : 1;

                segmentGroup.memorySegment.value = [];

                segmentGroup.memorySegment.value.push(loByte);
                if(segmentGroup.memorySegment.size > 1){
                    segmentGroup.memorySegment.value.push(hiByte);
                }



                if(segmentGroup.memorySegment.size !== oldSize){

                    //console.log('Adjusted size of memory segment for ' + segmentGroup.raw.trim() + ' to ' + segmentGroup.memorySegment.size + ' because ' + segmentGroup.memorySegment.labelName + '=' + value);

                    //Switch to correct opcode
                    if('addressModeOptions' in segmentGroup.memorySegment){

                        segmentGroup.memorySegment.value = [];

                        newAddressMode = segmentGroup.memorySegment.addressModeOptions[segmentGroup.memorySegment.size];
                        newIns = this.buildInstructionSegment(segmentGroup.instructionSegment.operator, newAddressMode);
                        if(newIns !== null){

                            segmentGroup.memorySegment.value.push(loByte);
                            if(segmentGroup.memorySegment.size > 1){
                                segmentGroup.memorySegment.value.push(hiByte);
                            }

                            segmentGroup.instructionSegment = newIns;
                            changes++;
                        }else{
                            //we failed to swap opcodes so put everything back as it was
                            segmentGroup.memorySegment.size = oldSize;

                            segmentGroup.memorySegment.value.push(loByte);
                            if(oldSize > 1){
                                segmentGroup.memorySegment.value.push(hiByte);
                            }

                        }
                    }
                }
            }

            segmentGroup.size = segmentGroup.instructionSegment.size + segmentGroup.memorySegment.size;

            lastGroup = segmentGroups[i];
        }

        if(changes > 0){ //call recursively until we've shuffled everything enough!
            return this.resolveLabels(segmentGroups);
        }else{

            // mark labels as resolved
            for(i =0; i < segmentGroups.length; i++) {
                segmentGroup = segmentGroups[i];

                if (segmentGroup.memorySegment.type === this.segmentTypes.LABEL) {
                    segmentGroup.memorySegment.type = this.segmentTypes.MEMORY;
                }
            }

            return segmentGroups;
        }

    };

    Assembler.prototype.getLabelValue = function(labelName, segmentGroups){

        var segmentGroup;

        for(var i =0; i < segmentGroups.length; i++) {

            segmentGroup = segmentGroups[i];

            if (segmentGroup.instructionSegment.type === this.segmentTypes.LABEL) {
                if (segmentGroup.instructionSegment.labelName === labelName) {
                    return segmentGroup.offset;
                }
            }else if (segmentGroup.instructionSegment.type === this.segmentTypes.VARIABLE) {
                if (segmentGroup.instructionSegment.labelName === labelName) {
                    return segmentGroup.instructionSegment.value;
                }
            }
        }

        throw new this.AssemblerError("Missing declaration for label: " + labelName);

    };

    Assembler.prototype.assembleLine = function (code, lineNo, offset) {
        code = code.replace(/;.*/, '');
        code = code.replace(/[\r\n]*/, '');
        code = code.replace(/^\s+|\s+$/gm,''); //trim
        code = code.toUpperCase();

        if(code === '') return null;

        var parts = code.split(/\s+/);
        var operator = parts[0];

        if(!(operator in this.cpu.opcodes)){
            if(operator.substring(operator.length-1,operator.length) === ':'){
                var labelName = operator.substring(0,operator.length-1);
                return {
                    offset: offset,
                    size: 0,
                    type: this.segmentGroupTypes.GHOST,
                    instructionSegment: {
                        type: this.segmentTypes.LABEL,
                        labelName: labelName,
                        size: 0
                    },
                    memorySegment: {size: 0}
                };
            }else if(operator === 'DEFINE'){
                if(parts.length < 3){
                    throw new this.AssemblerError('Missing parameter in define on line ' + lineNo);
                }

                return {
                    offset: offset,
                    size: 0,
                    type: this.segmentGroupTypes.GHOST,
                    instructionSegment: {
                        size: 0,
                        type: this.segmentTypes.VARIABLE,
                        labelName: parts[1],
                        value: this.parseStringToByteArray(parts[2], lineNo)[0] // @todo verify whether this will only ever be one byte - i.e. no define XYZ $1010
                    },
                    memorySegment: {size: 0}
                };
            }else {
                throw new this.AssemblerError('Unknown operator "' + operator + '" on line ' + lineNo);
            }
        }

        var addressData = this.getAddressData(parts, lineNo);

        var segment = this.buildInstructionSegment(operator, addressData.addressMode);

        if(segment === null){
            throw new this.AssemblerError('Invalid memory address mode (' + this.cpu.getAddressModeText(addressData.addressMode) + ') for operator ' + operator + ' on line ' + lineNo);
        }

        return {
            size: 1 + addressData.memoryAddressSegment.size,
            offset: offset,
            type: this.segmentGroupTypes.NORMAL,
            instructionSegment: segment,
            memorySegment: addressData.memoryAddressSegment
        };
    };

    Assembler.prototype.isBranchOperator = function(op){
        var bops = ['BEQ', 'BNE', 'BCS', 'BCC', 'BMI', 'BPL', 'BVC', 'BVS'];
        return bops.indexOf(op) !== -1;
    };

    Assembler.prototype.buildInstructionSegment = function(operator, addressMode){

        for(var opcode in this.cpu.instruction_table){
            if(addressMode instanceof Array){
                for(var i = 0; i < addressMode.length; i++){
                    if (this.cpu.instruction_table[opcode][0] === this.cpu.opcodes[operator] && this.cpu.instruction_table[opcode][1] === addressMode[i]) {

                        return {
                            value: parseInt(opcode, 10),
                            type: this.segmentTypes.INSTRUCTION,
                            operator: operator,
                            isBranch: this.isBranchOperator(operator),
                            size: 1
                        };
                    }
                }
            }else {
                if (this.cpu.instruction_table[opcode][0] === this.cpu.opcodes[operator] && this.cpu.instruction_table[opcode][1] === addressMode) {

                    return {
                        value: parseInt(opcode, 10),
                        type: this.segmentTypes.INSTRUCTION,
                        operator: operator,
                        isBranch: this.isBranchOperator(operator),
                        size: 1
                    };
                }
            }
        }

        return null;
    };

    Assembler.prototype.segmentTypes = {
        INSTRUCTION: 1,
        MEMORY: 2,
        LABEL: 3,
        VARIABLE: 4
    };

    Assembler.prototype.segmentGroupTypes = {
        NORMAL: 1,
        GHOST: 2
    };

    Assembler.prototype.getAddressData = function(parts, lineNo){

        // http://www.emulator101.com.s3-website-us-east-1.amazonaws.com/6502-addressing-modes/

        var data = {};

        var matches;

        var immediateRegex = /^#(\$?[0-9A-F]+)$/;
        var immediateLabelRegex = /^#([A-Z_]+)$/;
        var indirectRegex = /^\(\s*(\$[0-9A-F]+)\s*\)$/;
        var indirectLabelRegex = /^\(\s*([A-Z][A-Z_]*)\s*\)$/;
        var indexedRegex = /^(\$[0-9A-F]+)\s*,\s*(X|Y)$/;
        var indexedLabelRegex = /^([A-Z][A-Z_]*)\s*,\s*(X|Y)$/;
        var indexedIndirectRegex = /^\(\s*(\$[0-9A-F]+)\s*,\s*(X)\s*\)$/;
        var indexedIndirectLabelRegex = /^\(\s*([A-Z][A-Z_]*)\s*,\s*(X)\s*\)$/;
        var indirectIndexedRegex = /^\(\s*(\$[0-9A-F]+)\s*\)\s*,\s*(Y)$/;
        var indirectIndexedLabelRegex = /^\(\s*([A-Z][A-Z_]*)\s*\)\s*,\s*(Y)$/;
        var labelRegex = /^([A-Z_]+)$/;

        var indexed, offset;

        // @todo separate label/literal regexes so we can behave differently for later replacements

        if(parts.length === 1) {
            data.addressMode = [this.cpu.addressModes.IMPLICIT, this.cpu.addressModes.ACCUMULATOR];
            data.memoryAddressSegment = {
                size: 0,
                value: [],
                type: this.segmentTypes.MEMORY
            };
        }else if((matches = parts[1].match(immediateRegex)) !== null){
            data.addressMode = this.cpu.addressModes.IMMEDIATE;
            data.memoryAddressSegment = {
                size: 1,
                value: this.parseStringToByteArray(matches[1], lineNo),
                type: this.segmentTypes.MEMORY
            };
        }else if((matches = parts[1].match(immediateLabelRegex)) !== null){
            data.addressMode = this.cpu.addressModes.IMMEDIATE;
            data.memoryAddressSegment = {
                size: 1,
                type: this.segmentTypes.LABEL,
                labelName: matches[1]
            };
        }else if((matches = parts[1].match(labelRegex)) !== null){

            // this is sneaky. we set a "byte" value as a complete string: the label's name.
            // Once we have built the rest of the code, we can find the location of the label definition and swap
            // this original label name out for the offset value as a byte.
            var label = matches[1];
            data.addressMode = [this.cpu.addressModes.RELATIVE, this.cpu.addressModes.ZERO_PAGE, this.cpu.addressModes.ABSOLUTE];
            data.memoryAddressSegment = {
                size: 1,
                labelName: label,
                type: this.segmentTypes.LABEL,
                addressModeOptions: {
                    0: [],
                    1: [this.cpu.addressModes.RELATIVE, this.cpu.addressModes.ZERO_PAGE],
                    2: this.cpu.addressModes.ABSOLUTE
                }
            };

        }else if((matches = parts[1].match(indirectRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDIRECT_ABSOLUTE;
            data.memoryAddressSegment = {
                size: 2,
                value: this.parseStringToByteArray(matches[1], lineNo),
                type: this.segmentTypes.MEMORY
            };
        }else if((matches = parts[1].match(indirectLabelRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDIRECT_ABSOLUTE;
            data.memoryAddressSegment = {
                size: 2,
                type: this.segmentTypes.LABEL,
                labelName: matches[1]
            };
        }else if((matches = parts[1].match(indirectIndexedRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDIRECT_INDEXED;
            data.memoryAddressSegment = {
                size: 2,
                value: this.parseStringToByteArray(matches[1], lineNo),
                type: this.segmentTypes.MEMORY
            };
        }else if((matches = parts[1].match(indirectIndexedLabelRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDIRECT_INDEXED;
            data.memoryAddressSegment = {
                size: 2,
                type: this.segmentTypes.LABEL,
                labelName: matches[1]
            };
        }else if((matches = parts[1].match(indexedIndirectRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDEXED_INDIRECT;
            data.memoryAddressSegment = {
                size: 2,
                value: this.parseStringToByteArray(matches[1], lineNo),
                type: this.segmentTypes.MEMORY
            };
        }else if((matches = parts[1].match(indexedIndirectLabelRegex)) !== null){
            data.addressMode = this.cpu.addressModes.INDEXED_INDIRECT;
            data.memoryAddressSegment = {
                size: 2,
                type: this.segmentTypes.LABEL,
                labelName: matches[1]
            };
        }else if((matches = parts[1].match(indexedRegex)) !== null){ // (ABSOLUTE|ZEROPAGE) INDEXED
            indexed = matches[1];
            offset = matches[2];

            data.memoryAddressSegment = {
                size: 2,
                value: this.parseStringToByteArray(indexed, lineNo),
                type: this.segmentTypes.MEMORY
            };

            if(data.memoryAddressSegment.value.length === 1){
                data.memoryAddressSegment.size = 1;
                if(offset === 'X'){
                    data.addressMode = this.cpu.addressModes.ZERO_PAGE_X;
                }else if(offset === 'Y'){
                    data.addressMode = this.cpu.addressModes.ZERO_PAGE_Y;
                }else{
                    throw new this.AssemblerError('Invalid zero page memory addressing on line ' + lineNo + '. Must use X or Y - found ' + offset);
                }
            }else if(data.memoryAddressSegment.value.length !== 1){ //assume absolute for unresolved labels
                if(offset === 'X') {
                    data.addressMode = this.cpu.addressModes.ABSOLUTE_X;
                }else if(offset === 'Y'){
                    data.addressMode = this.cpu.addressModes.ABSOLUTE_Y;
                }else{
                    throw new this.AssemblerError('Invalid absolute memory addressing on line ' + lineNo + '. Must use X or Y - found ' + offset);
                }
            }else{
                throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
            }

        }else if((matches = parts[1].match(indexedLabelRegex)) !== null){ // (ABSOLUTE|ZEROPAGE) INDEXED
            indexed = matches[1];
            offset = matches[2];

            data.memoryAddressSegment = {
                size: 1,
                labelName: indexed,
                type: this.segmentTypes.LABEL
            };


            if(offset === 'X'){
                data.addressMode = this.cpu.addressModes.ZERO_PAGE_X;
                data.memoryAddressSegment.addressModeOptions = {
                    0: [],
                    1: this.cpu.addressModes.ZERO_PAGE_X,
                    2: this.cpu.addressModes.ABSOLUTE_X
                };
            }else if(offset === 'Y'){
                data.addressMode = this.cpu.addressModes.ZERO_PAGE_Y;
                data.memoryAddressSegment.addressModeOptions = {
                    0: [],
                    1: this.cpu.addressModes.ZERO_PAGE_Y,
                    2: this.cpu.addressModes.ABSOLUTE_Y
                };
            }else{
                throw new this.AssemblerError('Invalid zero page memory addressing on line ' + lineNo + '. Must use X or Y - found ' + offset);
            }


        }else if(parts[1].substring(0,1) === '$'){


            data.memoryAddressSegment = {
                value: this.parseStringToByteArray(parts[1], lineNo),
                type: this.segmentTypes.MEMORY,
                size: 1
            };

            data.memoryAddressSegment.size = data.memoryAddressSegment.value.length;

            if(data.memoryAddressSegment.value.length === 1){
                data.addressMode = this.cpu.addressModes.ZERO_PAGE;
            }else if(data.memoryAddressSegment.value.length === 2){
                data.addressMode = this.cpu.addressModes.ABSOLUTE;
            }else{
                throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
            }
        }else{
            throw new this.AssemblerError('Invalid memory addressing on line ' + lineNo);
        }

        return data;
    };

    Assembler.prototype.hexDumpSegmentGroup = function(segmentGroup){

        if(segmentGroup.type === this.segmentGroupTypes.GHOST) {
            return '';
        }

        var hex = '0x' + segmentGroup.instructionSegment.value.toString(16);

        if(typeof segmentGroup.memorySegment.value !== 'undefined') {
            for (var i = 0; i < segmentGroup.memorySegment.value.length; i++) {
                hex += ' 0x' + segmentGroup.memorySegment.value[i].toString(16);
            }
        }

        return hex;
    };

    Assembler.prototype.assemble = function (code) {
        this.labels = [];
        var lines = code.split(/\n/);
        var assembled = [];
        var segmentGroup;
        var offset = 0x600; // change this?
        for(var i =0; i < lines.length; i++){
            segmentGroup = this.assembleLine(lines[i], i+1, offset);
            if(segmentGroup !== null) {
                segmentGroup.raw = lines[i];
                if(segmentGroup.type !== this.segmentGroupTypes.GHOST) {
                    offset += (1 + segmentGroup.memorySegment.size);
                }
                assembled.push(segmentGroup);
            }
        }
        assembled = this.resolveLabels(assembled);

        return this.flatten(assembled);
    };

    Assembler.prototype.flatten = function(segmentGroups){

        var bytes = [];

        for(var i = 0; i < segmentGroups.length; i++){

            if(segmentGroups[i].type === this.segmentGroupTypes.GHOST) {
                continue;
            }

            //console.log(this.hexDumpSegmentGroup(segmentGroups[i]) + ' <-- ' + segmentGroups[i].raw);

            //Add byte for instruction
            bytes.push(segmentGroups[i].instructionSegment.value);

            // Add byte(s) for memory
            if(segmentGroups[i].memorySegment.type === this.segmentTypes.MEMORY) {
                bytes.push.apply(bytes, segmentGroups[i].memorySegment.value);
            }else if(segmentGroups[i].memorySegment.type === this.segmentTypes.LABEL) {
                throw new this.AssemblerError('Invalid segment type - label "' + segmentGroups[i].memorySegment.labelName + '" was not resolved');
            }else if(segmentGroups[i].memorySegment.type === this.segmentTypes.VARIABLE) {
                throw new this.AssemblerError('Invalid segment type - variable "' + segmentGroups[i].memorySegment.labelName + '" was not resolved');
            }else{
                throw new this.AssemblerError('Invalid segment type. Fatal error.');
            }
        }

        return bytes;
    };

    Assembler.prototype.parseStringToByteArray = function(num, lineNo){

        var bytes = [];

        var base = 16;

        if(num.substring(0,1) === '$') {
            num = num.substring(1, num.length);
        }else if(num.match(/^[0-9]+$/)){
            base = 10;
        }else{
            return [];
        }

        num = num.replace(/^0+/, '');

        if(num.length % 2 === 1 || num.length === 0){
            num = '0' + num;
        }

        var segments = num.match(/.{1,2}/g);

        if(segments !== null){
            for(var i = segments.length - 1; i >= 0; i--){
                bytes.push(parseInt(segments[i], base));
            }
        }else{
            throw new this.AssemblerError("Cannot parse non-numeric value on line " + lineNo + ": " + num);
        }



        return bytes;
    };

    w.JNE.Assembler = Assembler;

})(window);
