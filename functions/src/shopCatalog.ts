export type StoreProduct={
  id:string
  name:string
  category:'Apparel'|'Accessories'|'Volleyball gear'|'Gifts'
  description:string
  unitAmount:number
  sizes?:string[]
  available:boolean
  tag?:string
  mark:string
  tone:'orange'|'gold'|'ink'|'cream'
  previousAmount?:number
  priceFrom?:boolean
  imageUrl?:string
  imagePath?:string
  updatedAt?:number
  updatedBy?:string
}

const apparelSizes=['XS','S','M','L','XL','2XL']
export const storeProducts:StoreProduct[]=[
  {id:'womens-sweater',name:'F6 Womens Sweater',category:'Apparel',description:'A warm club layer for travel, training and the sidelines.',unitAmount:2500,sizes:apparelSizes,available:true,mark:'SWEATER',tone:'cream'},
  {id:'black-cotton-shirt',name:'F6 Black Cotton Shirt',category:'Apparel',description:'Everyday Flaming Six colours, on and off court.',unitAmount:2000,sizes:apparelSizes,available:true,mark:'COTTON',tone:'ink'},
  {id:'womens-hoodie',name:'F6 Womens Club Hoodie',category:'Apparel',description:'A comfortable club hoodie for match days and beyond.',unitAmount:3000,sizes:apparelSizes,available:true,mark:'CLUB HOODIE',tone:'orange'},
  {id:'mens-hoodie',name:'F6 Mens Club Hoodie',category:'Apparel',description:'A comfortable club hoodie for match days and beyond.',unitAmount:3000,sizes:apparelSizes,available:true,mark:'CLUB HOODIE',tone:'ink'},
  {id:'mens-sports-shirt',name:'F6 Mens Sports T-shirt',category:'Apparel',description:'A performance tee for training, tournaments and warm-ups.',unitAmount:2000,sizes:apparelSizes,available:true,mark:'SPORT',tone:'orange'},
  {id:'womens-sports-shirt',name:'F6 Womens Sports T-shirt',category:'Apparel',description:'A performance tee for training, tournaments and warm-ups.',unitAmount:2000,sizes:apparelSizes,available:true,mark:'SPORT',tone:'gold'},
  {id:'mens-vest',name:'F6 Mens Vest',category:'Apparel',description:'Lightweight, breathable club kit for warm sessions.',unitAmount:1500,sizes:apparelSizes,available:true,mark:'TRAIN',tone:'ink'},
  {id:'club-vest',name:'F6 Vest',category:'Apparel',description:'A light sports vest in Flaming Six club colours.',unitAmount:1500,sizes:apparelSizes,available:true,mark:'TRAIN',tone:'cream'},
  {id:'beanie',name:'F6 Beanie',category:'Apparel',description:'A warm Flaming Six beanie for the colder months.',unitAmount:1400,sizes:['One size'],available:true,mark:'BEANIE',tone:'gold'},
  {id:'snapback',name:'F6 5-Panel Snapback',category:'Apparel',description:'A classic cap with Flaming Six club styling.',unitAmount:2000,sizes:['One size'],available:true,mark:'F6 CAP',tone:'orange'},
  {id:'duffle-bag',name:'F6 Duffle Bag',category:'Accessories',description:'Room for your kit, shoes and match-day essentials.',unitAmount:4000,available:true,mark:'KIT BAG',tone:'ink'},
  {id:'tote-bag',name:'F6 Tote Bag',category:'Accessories',description:'A handy everyday tote in club colours.',unitAmount:250,previousAmount:500,available:true,mark:'TOTE',tone:'cream'},
  {id:'pin',name:'F6 Pin',category:'Accessories',description:'A small way to show your Flaming Six pride.',unitAmount:300,available:true,mark:'F6 PIN',tone:'gold'},
  {id:'water-bottle',name:'F6 Water Bottle',category:'Accessories',description:'Keep hydrated at training and on match day.',unitAmount:900,previousAmount:1400,available:true,mark:'HYDRATE',tone:'orange'},
  {id:'backpack',name:'F6 Twin Handle Roll-Top Backpack',category:'Accessories',description:'A roll-top club backpack for commuting and carrying kit.',unitAmount:3500,available:true,mark:'ROLL-TOP',tone:'ink'},
  {id:'stickers',name:'Pack of Stickers · 5 designs',category:'Accessories',description:'Five club designs for bottles, laptops, notebooks or kit bags.',unitAmount:400,available:true,tag:'Pre-order',mark:'STICKERS',tone:'gold'},
  {id:'armguards',name:'Armguards',category:'Volleyball gear',description:'Volleyball arm protection for training and matches.',unitAmount:1700,sizes:['XS','S','M','L','XL'],available:true,mark:'PLAY',tone:'orange'},
  {id:'knee-pads',name:'Knee Pads',category:'Volleyball gear',description:'Court-ready knee protection for training and match days.',unitAmount:2700,sizes:['XS','S','M','L','XL'],available:true,mark:'PLAY',tone:'ink'},
  {id:'gift-card',name:'Flaming Six Gift Card',category:'Gifts',description:'Choose a gift card amount from £10.',unitAmount:1000,available:true,mark:'GIFT',tone:'cream',priceFrom:true},
]

export const storeProductMap=()=>Object.fromEntries(storeProducts.map(product=>[product.id,product]))
