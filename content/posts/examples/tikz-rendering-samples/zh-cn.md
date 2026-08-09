---
title: TikZ 渲染测试样例
description: 从本地 TikZ 绘图示例整理而成，用于验证构建期静态 SVG 渲染、字体嵌入和响应式排版。
publishedAt: 2026-08-09
tags:
  - tikz
  - diagrams
  - testing
draft: false
---

本文逐项保留测试文件中的 TikZ 绘图源码。每个围栏都补全了 `\begin{document}` 与 `\end{document}`，可直接用于验证本站的构建期 TikZ 渲染链路。

## 坐标轴与圆

```tikz alt="带坐标轴的圆形示意图" caption="图 1：带 x、y 坐标轴的圆" width="24rem" align="center"
\begin{document}
\begin{tikzpicture}
\draw[->] (-3,0) -- (3,0) node[right] {$x$};
\draw[->] (0,-3) -- (0,3) node[above] {$y$};
\draw[thick] (0,0) circle (2);
\end{tikzpicture}
\end{document}
```

## 极坐标网格与扇形微元

```tikz alt="极坐标网格中的阴影圆形区域和微元" caption="图 2：极坐标网格、圆形区域 D 与微元" width="44rem" align="center"
\begin{document}
\begin{tikzpicture}

% 4. 绘制图形区域 D (粗线圆)
    \draw[thick] (45:4.2) circle (2.5);
    \fill[gray!50] (45:4.2) circle (2.5);

    % 1. 定义原点和极轴
    \coordinate (O) at (0,0);
    \coordinate (A) at (7.5,0);

    % 2. 绘制极网格 (灰度射线和圆弧)
    \foreach \angle in {10,20,30,40,50,60,70,80,90} {
        \draw (O) -- (\angle:7);
    }
    % 圆弧: 半径从 1.5 到 7.5，步长 1
    \foreach \r in {1.5,2.5,3.5,4.5,5.5,6.5} {
        \draw (0:\r) arc (0:90:\r);
    }

    % 3. 绘制极轴 OA (粗线，带箭头)
    \draw[->] (O) -- (A) node[below] {\(A\)};
    \node[below left] at (O) {\(O\)};





    % 5. 绘制阴影微元 \Delta\sigma_i (填充并描边)
    \fill[red!75] (40:4.5) arc (40:50:4.5) -- (50:5.5) arc (50:40:5.5) -- cycle;
    \draw (40:4.5) arc (40:50:4.5) -- (50:5.5) arc (50:40:5.5) -- cycle;

    % 6. 添加标注和向量
    % 标注 D
    \node at (55:6) {\(D\)};

    % 标注微元 \Delta\sigma_i
    \node at (46:5) {\(\Delta\sigma\)};

    % 标注 \Delta\theta_i (使用带箭头的弧线)
    \draw[<->, thin] (40:4.3) arc (40:50:4.3);
    \node at (46:3.9) {\(\rho\Delta\theta\)};

    % 标注 \Delta \r (使用带箭头的直线)
    \draw[<->, thin] (38:4.5) -- (38:5.5);
    \node at (34:5.0) {\(\Delta\rho\)};


\end{tikzpicture}
\end{document}
```

## 单位圆与极角

```tikz alt="带极角标记的单位圆" caption="图 3：单位圆、极角与半径标注" width="26rem" align="center"
\begin{document}
\begin{tikzpicture}[scale=2]
        % 单位圆
        \draw[thick] (0,0) circle (1);
        \fill[gray!30] (0,0) circle (1);

        % 极轴
        \draw[->] (-1.3,0) -- (1.3,0) node[right] {$x$};
        \draw[->] (0,-1.3) -- (0,1.3) node[above] {$y$};

        % 射线示例
        \draw[] (0,0) -- (60:1.2);
        \draw[->] (0.35,0) arc (0:60:0.35) node[midway, right] {$\theta$};

        \node at (0.5,0.5) {$D$};
        \node at (0.7,1.2) {$\rho=1$};

\end{tikzpicture}
\end{document}
```

## 心脏线极坐标区域

```tikz alt="心脏线围成的极坐标区域" caption="图 4：极坐标心脏线与角度标注" width="30rem" align="center"
\begin{document}
\begin{tikzpicture}

        % 心脏线
        \draw[thick, domain=0:360, smooth,samples=200] plot (\x:{1+cos(\x)});
        \fill[gray!30] plot[domain=0:360, smooth,samples=200] (\x:{1+cos(\x)}) -- cycle;

        \draw[->] (-0.5,0) -- (2.5,0) node[right] {$x$};
        \draw[->] (0,-1.3) -- (0,1.3) node[above] {$y$};

        % 射线示例
        \draw (0,0) -- (40:{1.2+cos(40)});
        \draw[->] (0.4,0) arc (0:40:0.4) node[midway, right] {$\theta$};

        \node at (1.5,0.4) {$D$};
        \node at (2.2,1.1) {$\rho=1+\cos\theta$};

\end{tikzpicture}
\end{document}
```

## 四分之一单位圆区域

```tikz alt="第一象限的四分之一单位圆区域" caption="图 5：由坐标轴与四分之一圆弧围成的区域 D" width="22rem" align="center"
\begin{document}
\begin{tikzpicture}[scale=2.5]
        \draw[->] (-0.2,0) -- (1.3,0) node[right] {$x$};
        \draw[->] (0,-0.2) -- (0,1.3) node[above] {$y$};
        \fill[gray!30] (0,0) -- (1,0) arc (0:90:1) -- cycle;
        \draw[thick] (0,0) -- (1,0) arc (0:90:1) -- cycle;
        \node[below] at (1,0) {$1$};
        \node[left] at (0,1) {$1$};
        \node at (0.5,0.5) {$D$};
\end{tikzpicture}
\end{document}
```

以上五个图覆盖坐标轴、圆、极坐标、循环绘制、填充、箭头、数学标签和函数曲线，可作为 TikZ 构建期渲染的回归测试文章。
