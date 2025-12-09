import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
export default function TimeSeriesChart({data,color,label}:{data:any[],color:string,label:string}){
  return (
    <div className="h-40 bg-black border border-gray-800">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{top:5,right:10,left:0,bottom:5}}>
          <CartesianGrid stroke="#222" />
          <XAxis dataKey="t" stroke="#666" tick={{fontSize:10}}/>
          <YAxis stroke="#666" tick={{fontSize:10}}/>
          <Tooltip contentStyle={{background:'#000', border:'1px solid #333', color:'#fff'}}/>
          <Line type="monotone" dataKey="v" stroke={color} dot={false} name={label} strokeWidth={1.5}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
