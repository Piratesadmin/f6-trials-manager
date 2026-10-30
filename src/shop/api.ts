import {httpsCallable} from 'firebase/functions'
import {signupManagerFunctions} from '../signup/firebase'
import type {ShopOrderStatus} from '../types'
import type {ShopCategory,ShopProduct} from '../data/shopProducts'

type Item={productId:string;quantity:number;size?:string}
type Customer={name:string;email:string;phone:string}
type CheckoutResponse={clientSecret:string;publishableKey:string;orderId:string;totalAmount:number}
function callable<Request,Response>(name:string){if(!signupManagerFunctions)throw new Error('The shop payment service is not configured.');return httpsCallable<Request,Response>(signupManagerFunctions,name)}
export async function createShopCheckoutSession(items:Item[],customer:Customer){const response=await callable<{items:Item[];name:string;email:string;phone:string;fulfilment:'collection';returnUrl:string},CheckoutResponse>('createShopCheckoutSession')({items,...customer,fulfilment:'collection',returnUrl:`${window.location.origin}${window.location.pathname}#/shop`});return response.data}
export async function getShopCheckoutStatus(sessionId:string){const response=await callable<{sessionId:string},{status:string;paymentStatus:string;orderId:string}>('getShopCheckoutStatus')({sessionId});return response.data}
export async function updateShopOrderStatus(orderId:string,status:ShopOrderStatus){await callable<{orderId:string;status:ShopOrderStatus},{ok:boolean}>('updateShopOrderStatus')({orderId,status})}
export type ManagedProduct={id:string;name:string;category:ShopCategory;description:string;unitAmount:number;sizes?:string[];available:boolean;tag?:string;mark:string;tone:ShopProduct['tone'];previousAmount?:number;priceFrom?:boolean;imageUrl?:string;imagePath?:string}
export async function saveShopProduct(product:ManagedProduct){const response=await callable<ManagedProduct, {product:ManagedProduct}>('saveShopProduct')(product);return response.data.product}
export async function archiveShopProduct(id:string){await callable<{id:string},{ok:boolean}>('archiveShopProduct')({id})}
export async function uploadShopProductImage(id:string,dataUrl:string){const response=await callable<{id:string;dataUrl:string},{imageUrl:string;imagePath:string}>('uploadShopProductImage')({id,dataUrl});return response.data}
export async function removeShopProductImage(id:string){await callable<{id:string},{ok:boolean}>('removeShopProductImage')({id})}
