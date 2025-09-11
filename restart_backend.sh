#!/bin/bash

# 停止当前运行的后端进程
echo "Stopping current backend process..."
if [ -f backend/python_app.pid ]; then
  PID=$(cat backend/python_app.pid)
  if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo "Stopped process with PID: $PID"
  fi
fi

# 进入后端目录
cd backend

# 启动后端
echo "Starting backend server..."
SVC_ENV=prod nohup python main.py >> log/output.log 2>&1 &
echo $! > python_app.pid
echo "Backend started with PID: $(cat python_app.pid)"

# 返回上级目录
cd ..

echo "Backend server restarted successfully."
echo "You can check the logs with: tail -f backend/log/output.log" 