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


export async function loadImageUNORM8(path: string): Promise<{
    width: number;
    height: number;
    data: Uint8Array;  // RGB UNORM8
}> {
    console.log("loading texture:",path)
    const img = await Jimp.read(path);
    const data_raw = new Uint8Array(img.bitmap.data);

    const hasAlpha = img.hasAlpha();

    let data = new Uint8Array(img.bitmap.width * img.bitmap.height * 4);
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


    console.log("=== First 10 pixels of",path)
    for (let i = 0; i < 10; i++) {
        console.log(data[i*4+0],data[i*4+1],data[i*4+2],data[i*4+3])
    }

    return { width: img.bitmap.width, height: img.bitmap.height, data: data };
}

export class TextureManager{
    public albedo_block:TextureBlock;
    public normal_block:TextureBlock;

    constructor(){
        this.albedo_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
        this.normal_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
    }

    public fillEmptyTextures(){
        if(this.albedo_block.data_512.length === 0){
            console.log("Filing empty albedo 512")
            this.albedo_block.data_512.push(new Uint8Array(512*512*4));
        }
        if(this.albedo_block.data_1024.length === 0){
            console.log("Filing empty albedo 1024")
            this.albedo_block.data_1024.push(new Uint8Array(1024*1024*4));
        }
        if(this.albedo_block.data_2048.length === 0){
            console.log("Filing empty albedo 2048")
            this.albedo_block.data_2048.push(new Uint8Array(2048*2048*4));
        }

        if(this.normal_block.data_512.length === 0){
            console.log("Filing empty normal 512")
            this.normal_block.data_512.push(new Uint8Array(512*512*4));
        }
        if(this.normal_block.data_1024.length === 0){
            console.log("Filing empty normal 1024")
            this.normal_block.data_1024.push(new Uint8Array(1024*1024*4));
        }
        if(this.normal_block.data_2048.length === 0){
            console.log("Filing empty normal 2048")
            this.normal_block.data_2048.push(new Uint8Array(2048*2048*4));
        }
    }

    public async addAlbedo(path:string):Promise<LoadedTextureInfo>{
        return await this.addImage(path,this.albedo_block);
    }

    public async addNormal(path:string):Promise<LoadedTextureInfo>{
        return await this.addImage(path,this.normal_block);
    }

    private async addImage(path:string,block:TextureBlock):Promise<LoadedTextureInfo> {
        let array:number, index:number;
        let {width,height,data} = await loadImageUNORM8(path);

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