import * as React from "react"
import Svg, { Defs, Circle, Path } from "react-native-svg"
/* SVGR has dropped some elements not supported by react-native-svg: style */
const MoChatSend = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    id="Layer_1"
    data-name="Layer 1"
    viewBox="0 0 43.44 43.44"
    {...props}
  >
    <Defs></Defs>
    <Circle fill={'none'} stroke={'#c4f135'} strokeMiterlimit={10} strokeWidth={'3px'} cx={21.72} cy={21.72} r={20.22} />
    <Path
      fill={'none'} stroke={'#c4f135'} strokeMiterlimit={10} strokeWidth={'3px'}
      d="m12.76 22.83 8.96-8.95 8.96 8.95M21.72 31.86V13.88"
    />
  </Svg>
)
export default MoChatSend

