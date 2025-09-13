import type Output from "../Output";

type Generator = () => Promise<Output>;

export default Generator;
