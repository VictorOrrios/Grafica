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
    data: Uint8Array;  // RGBA UNORM8
}> {
    console.log("Loading texture:",path)
    const img = await Jimp.read(path);
    const data_raw = new Uint8Array(img.bitmap.data);

    const hasAlpha = data_raw.length === img.bitmap.width * img.bitmap.height * 4;

    let data:Uint8Array = new Uint8Array(img.bitmap.width * img.bitmap.height * 4);
    for (let i = 0, j = 0; i < data_raw.length; i += hasAlpha? 4:3, j += 4) {
        if(channels == Channels.GB){
            data[j] = data_raw[i + 1];     // R
            data[j + 1] = data_raw[i + 2]; // G
            data[j + 2] = 255;             // B
            data[j + 3] = 255              // A
        }else{
            data[j] = data_raw[i];         // R
            data[j + 1] = data_raw[i + 1]; // G
            data[j + 2] = data_raw[i + 2]; // B
            data[j + 3] = 255              // A
        }
    }

    return { width: img.bitmap.width, height: img.bitmap.height, data: data };
}

export class TextureManager{
    public tex_block:TextureBlock;

    constructor(){
        this.tex_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
    }

    public fillEmptyTextures(){
        if(this.tex_block.data_512.length === 0) this.tex_block.data_512.push(new Uint8Array(512*512*4));
        if(this.tex_block.data_1024.length === 0) this.tex_block.data_1024.push(new Uint8Array(1024*1024*4));
        if(this.tex_block.data_2048.length === 0) this.tex_block.data_2048.push(new Uint8Array(2048*2048*4));
    }

    public async addImage(path:string):Promise<LoadedTextureInfo>{
        let {width,height,data} = await loadImageUNORM8(path,Channels.RGBA);
        return this.addToBlock(width,height,data,path);
    }

    public async addRMImage(path:string, channels:Channels = Channels.GB):Promise<LoadedTextureInfo>{
        let {width,height,data} = await loadImageUNORM8(path,channels);
        for (let i = 0; i < data.length; i += 2) {
            data[i] = Math.max(2,data[i]);
        }
        return this.addToBlock(width,height,data,path);
    }


    public addToBlock(width:number, height:number, data:Uint8Array, path:string):LoadedTextureInfo{
        if(width !== height){
            console.error("Could not load non square image",path)
            return {array:0,index:-1};
        }

        let array, index;
        if(width == 512){
            array = 1;
            index = this.tex_block.data_512.length;
            this.tex_block.data_512.push(data);
        }else if(width == 1024){
            array = 2;
            index = this.tex_block.data_1024.length;
            this.tex_block.data_1024.push(data);
        }else if(width == 2048){
            array = 3;
            index = this.tex_block.data_2048.length;
            this.tex_block.data_2048.push(data);
        }else{
            console.error("Could not load image of unsuported size",path,width)
            return {array:0,index:-1};
        }
        
        console.log("Texture loaded array:",array,"index:",index);

        return {array,index};
    }
    
};