export type ShopCategory = 'Apparel' | 'Accessories' | 'Volleyball gear' | 'Gifts'

export type ShopProduct = {
  id: string
  name: string
  category: ShopCategory
  price: number
  previousPrice?: number
  priceFrom?: boolean
  description: string
  tag?: string
  sizes?: string[]
  available?: boolean
  imageUrl?: string
  imagePath?: string
  mark: string
  tone: 'orange' | 'gold' | 'ink' | 'cream'
}

export const shopCategories: Array<'All' | ShopCategory> = ['All', 'Apparel', 'Accessories', 'Volleyball gear', 'Gifts']
const clothingSizes=['XS','S','M','L','XL','2XL']

export const shopProducts: ShopProduct[] = [
  {id:'womens-sweater',name:'F6 Womens Sweater',category:'Apparel',price:25,description:'A warm club layer for travel, training and the sidelines.',sizes:clothingSizes,mark:'SWEATER',tone:'cream'},
  {id:'black-cotton-shirt',name:'F6 Black Cotton Shirt',category:'Apparel',price:20,description:'Everyday Flaming Six colours, on and off court.',sizes:clothingSizes,mark:'COTTON',tone:'ink'},
  {id:'womens-hoodie',name:'F6 Womens Club Hoodie',category:'Apparel',price:30,description:'A comfortable club hoodie for match days and beyond.',sizes:clothingSizes,mark:'CLUB HOODIE',tone:'orange'},
  {id:'mens-hoodie',name:'F6 Mens Club Hoodie',category:'Apparel',price:30,description:'A comfortable club hoodie for match days and beyond.',sizes:clothingSizes,mark:'CLUB HOODIE',tone:'ink'},
  {id:'mens-sports-shirt',name:'F6 Mens Sports T-shirt',category:'Apparel',price:20,description:'A performance tee for training, tournaments and warm-ups.',sizes:clothingSizes,mark:'SPORT',tone:'orange'},
  {id:'womens-sports-shirt',name:'F6 Womens Sports T-shirt',category:'Apparel',price:20,description:'A performance tee for training, tournaments and warm-ups.',sizes:clothingSizes,mark:'SPORT',tone:'gold'},
  {id:'mens-vest',name:'F6 Mens Vest',category:'Apparel',price:15,description:'Lightweight, breathable club kit for warm sessions.',sizes:clothingSizes,mark:'TRAIN',tone:'ink'},
  {id:'club-vest',name:'F6 Vest',category:'Apparel',price:15,description:'A light sports vest in Flaming Six club colours.',sizes:clothingSizes,mark:'TRAIN',tone:'cream'},
  {id:'beanie',name:'F6 Beanie',category:'Apparel',price:14,description:'A warm Flaming Six beanie for the colder months.',sizes:['One size'],mark:'BEANIE',tone:'gold'},
  {id:'snapback',name:'F6 5-Panel Snapback',category:'Apparel',price:20,description:'A classic cap with Flaming Six club styling.',sizes:['One size'],mark:'F6 CAP',tone:'orange'},
  {id:'duffle-bag',name:'F6 Duffle Bag',category:'Accessories',price:40,description:'Room for your kit, shoes and match-day essentials.',mark:'KIT BAG',tone:'ink'},
  {id:'tote-bag',name:'F6 Tote Bag',category:'Accessories',price:2.5,previousPrice:5,description:'A handy everyday tote in club colours.',mark:'TOTE',tone:'cream'},
  {id:'pin',name:'F6 Pin',category:'Accessories',price:3,description:'A small way to show your Flaming Six pride.',mark:'F6 PIN',tone:'gold'},
  {id:'water-bottle',name:'F6 Water Bottle',category:'Accessories',price:9,previousPrice:14,description:'Keep hydrated at training and on match day.',mark:'HYDRATE',tone:'orange'},
  {id:'backpack',name:'F6 Twin Handle Roll-Top Backpack',category:'Accessories',price:35,description:'A roll-top club backpack for commuting and carrying kit.',mark:'ROLL-TOP',tone:'ink'},
  {id:'stickers',name:'Pack of Stickers · 5 designs',category:'Accessories',price:4,description:'Five club designs for bottles, laptops, notebooks or kit bags.',tag:'Pre-order',mark:'STICKERS',tone:'gold'},
  {id:'armguards',name:'Armguards',category:'Volleyball gear',price:17,description:'Volleyball arm protection for training and matches.',sizes:['XS','S','M','L','XL'],mark:'PLAY',tone:'orange'},
  {id:'knee-pads',name:'Knee Pads',category:'Volleyball gear',price:27,description:'Court-ready knee protection for training and match days.',sizes:['XS','S','M','L','XL'],mark:'PLAY',tone:'ink'},
  {id:'gift-card',name:'Flaming Six Gift Card',category:'Gifts',price:10,priceFrom:true,description:'Choose a gift card amount from £10.',mark:'GIFT',tone:'cream'},
]
