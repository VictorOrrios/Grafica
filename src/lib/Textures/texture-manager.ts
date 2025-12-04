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
    const img = await Jimp.read(path);
    const data = new Uint8Array(img.bitmap.data);

    const hasAlpha = false;

    if (hasAlpha) {
        console.warn("Image with alpha channel detected:",path)
    }

    return { width: img.bitmap.width, height: img.bitmap.height, data: data };
}

export class TextureManager{
    private albedo_block:TextureBlock;

    constructor(){
        this.albedo_block = {
            data_512:[],data_1024:[],data_2048:[],
        };
    }

    public async addAlbedo(path:string):Promise<LoadedTextureInfo>{
        return await this.addImage(path,this.albedo_block);
    }

    private async addImage(path:string,block:TextureBlock):Promise<LoadedTextureInfo> {
        let array:number, index:number;
        let {width,height,data} = await loadImageUNORM8(path);

        if(width !== height){
            console.error("Could not load non square image",path)
            return {array:-1,index:-1};
        }

        if(width == 512){
            array = 0;
            index = block.data_512.length;
            block.data_512.push(data);
        }else if(width == 1024){
            array = 1;
            index = block.data_1024.length;
            block.data_1024.push(data);
        }else if(width == 2048){
            array = 2;
            index = block.data_2048.length;
            block.data_2048.push(data);
        }else{
            console.error("Could not load image of unsuported size",path,width)
            return {array:-1,index:-1};
        }

        return {array,index};
    }
    
};