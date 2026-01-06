import { Jimp } from "jimp";

export type TextureBlock = {
    data_512:Uint8Array[],
    data_1024:Uint8Array[],
    data_2048:Uint8Array[],
};

export type LoadedTextureInfo = {
    array:number,
    index:number,
};

export enum Channels {
    RGBA,
    RG,
    GB,
    NONE
}


export async function loadImageUNORM8(path: string, channels:Channels): Promise<{
    width: number;
    height: number;
    data: Uint8Array;  // RGB UNORM8
}> {
    console.log("loading texture:",path)
    const img = await Jimp.read(path);
    const data_raw = new Uint8Array(img.bitmap.data);

    const hasAlpha = data_raw.length === img.bitmap.width * img.bitmap.height * 4;

    let data:Uint8Array;
    if(channels == Channels.RGBA){
        data = new Uint8Array(img.bitmap.width * img.bitmap.height * 4);
        if (data_raw.length === data.length) {
            data.set(data_raw,0);
        }else{
            for (let i = 0, j = 0; i < data_raw.length; i += 3, j += 4) {
                data[j] = data_raw[i];         // R
                data[j + 1] = data_raw[i + 1]; // G
                data[j + 2] = data_raw[i + 2]; // B
                data[j + 3] = 255              // A
            } 
        }  
    }else if(channels == Channels.RG){
        data = new Uint8Array(img.bitmap.width * img.bitmap.height * 2);
        if(hasAlpha){
            for (let i = 0, j = 0; i < data_raw.length; i += 4, j += 2) {
                data[j] = data_raw[i];          // R
                data[j + 1] = data_raw[i+1];    // G
            } 
        }else{
            for (let i = 0, j = 0; i < data_raw.length; i += 3, j += 2) {
                data[j] = data_raw[i];          // R
                data[j + 1] = data_raw[i+1];    // G
            } 
        }
    }else if(channels == Channels.GB){
        data = new Uint8Array(img.bitmap.width * img.bitmap.height * 2);
        if(hasAlpha){
            for (let i = 0, j = 0; i < data_raw.length; i += 4, j += 2) {
                data[j] = data_raw[i+1];          // R
                data[j + 1] = data_raw[i+2];      // G
            } 
        }else{
            for (let i = 0, j = 0; i < data_raw.length; i += 3, j += 2) {
                data[j] = data_raw[i+1];          // R
                data[j + 1] = data_raw[i+2];      // G
            } 
        }
    }else if(channels == Channels.NONE){
        return {width:-1,height:-1,data: new Uint8Array()}
    }else{
        console.error("loadImageUNORM8 unsuported channel extraction",channels);
        return {width:-1,height:-1,data: new Uint8Array()}
    } 

    /*
    console.log("=== First 10 values of",path)
    for (let i = 0; i < 10; i++) {
        console.log(data[i])
    }
    */
   
    return { width: img.bitmap.width, height: img.bitmap.height, data: data };
}

export class TextureManager{
    public albedo_block:TextureBlock;
    public normal_block:TextureBlock;
    public roughmetal_block:TextureBlock;
    public emission_block:TextureBlock;

    constructor(){
        this.albedo_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
        this.normal_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
        this.roughmetal_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
        this.emission_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
    }

    public fillEmptyTextures(){
        function fillEmpty(block:TextureBlock,x:number){
            if(block.data_512.length === 0) block.data_512.push(new Uint8Array(512*512*x));
            if(block.data_1024.length === 0) block.data_1024.push(new Uint8Array(1024*1024*x));
            if(block.data_2048.length === 0) block.data_2048.push(new Uint8Array(2048*2048*x));
        }

        fillEmpty(this.albedo_block,4);
        fillEmpty(this.normal_block,4);
        fillEmpty(this.roughmetal_block,2);
        fillEmpty(this.emission_block,4);
    }

    public async addAlbedo(path:string):Promise<LoadedTextureInfo>{
        let {width,height,data} = await loadImageUNORM8(path,Channels.RGBA);
        return await this.addImage(path,this.albedo_block,width,height,data);
    }

    public async addNormal(path:string):Promise<LoadedTextureInfo>{
        let {width,height,data} = await loadImageUNORM8(path,Channels.RGBA);
        return await this.addImage(path,this.normal_block,width,height,data);
    }

    public async addRoughMetal(path:string,channels:Channels = Channels.GB):Promise<LoadedTextureInfo>{
        if(channels == Channels.NONE) return {array:0,index:-1};
        let {width,height,data} = await loadImageUNORM8(path,channels);
        for (let i = 0; i < data.length; i += 2) {
            data[i] = Math.max(2,data[i]);
        }
        /*
        console.log("=== RM First 10 values of",path)
        for (let i = 0; i < 10; i++) {
            console.log(data[i])
        }
        */
        return await this.addImage(path,this.roughmetal_block,width,height,data);
    }

    public async addEmission(path:string):Promise<LoadedTextureInfo>{
        let {width,height,data} = await loadImageUNORM8(path,Channels.RGBA);
        return await this.addImage(path,this.emission_block,width,height,data);
    }

    private async addImage(path:string,block:TextureBlock,width:number,height:number,data:Uint8Array):Promise<LoadedTextureInfo> {
        let array:number, index:number;

        if(width !== height){
            console.error("Could not load non square image",path)
            return {array:0,index:-1};
        }

        if(width == 512){
            array = 1;
            index = block.data_512.length;
            block.data_512.push(data);
        }else if(width == 1024){
            array = 2;
            index = block.data_1024.length;
            block.data_1024.push(data);
        }else if(width == 2048){
            array = 3;
            index = block.data_2048.length;
            block.data_2048.push(data);
        }else{
            console.error("Could not load image of unsuported size",path,width)
            return {array:0,index:-1};
        }
        
        console.log("Texture loaded array:",array,"index:",index);

        return {array,index};
    }
    
};