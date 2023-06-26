// adapted from https://stackoverflow.com/a/21070876/1938624

export class TwoWayMap<T,U>{
	private map: Map<T,U>;
	private reverseMap: Map<U,T>;

	constructor(map:Map<T,U>){
		this.map = map;
		this.reverseMap = new Map<U,T>();

		map.forEach((v,k)=>{
			// This checks for multiple names for a unit.  Use the first name by default for the reverse lookup.
			if (!this.reverseMap.has(v)){
				this.reverseMap.set(v,k);
			}
		});
		
	}

	
	public has(key:T) {return this.map.has(key);}
	public revHas(key:U) {return this.reverseMap.has(key);}

	public get(key:T) { return this.map.get(key); }
	public revGet(key:U) { return this.reverseMap.get(key); }

	public keys() { return this.map.keys(); }
	public values() { return this.reverseMap.keys(); }

	public forEach(callbackfn: (value: U, key: T, map: Map<T, U>) => void) { return this.map.forEach(callbackfn);}
	

	public array() { return [...this.map];}
	public arrayReverse() { return [...this.reverseMap];}


}