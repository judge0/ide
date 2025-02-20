"use strict";
import editor from "./editor.js";
import language from "./language.js";
import { DEFAULT_LANGUAGE } from "../clients.js";

const DEFAULT_SOURCE = `\
#include <algorithm>
#include <cstdint>
#include <iostream>
#include <limits>
#include <set>
#include <utility>
#include <vector>

using Vertex    = std::uint16_t;
using Cost      = std::uint16_t;
using Edge      = std::pair< Vertex, Cost >;
using Graph     = std::vector< std::vector< Edge > >;
using CostTable = std::vector< std::uint64_t >;

constexpr auto kInfiniteCost{ std::numeric_limits< CostTable::value_type >::max() };

auto dijkstra( Vertex const start, Vertex const end, Graph const & graph, CostTable & costTable )
{
    std::fill( costTable.begin(), costTable.end(), kInfiniteCost );
    costTable[ start ] = 0;

    std::set< std::pair< CostTable::value_type, Vertex > > minHeap;
    minHeap.emplace( 0, start );

    while ( !minHeap.empty() )
    {
        auto const vertexCost{ minHeap.begin()->first  };
        auto const vertex    { minHeap.begin()->second };

        minHeap.erase( minHeap.begin() );

        if ( vertex == end )
        {
            break;
        }

        for ( auto const & neighbourEdge : graph[ vertex ] )
        {
            auto const & neighbour{ neighbourEdge.first };
            auto const & cost{ neighbourEdge.second };

            if ( costTable[ neighbour ] > vertexCost + cost )
            {
                minHeap.erase( { costTable[ neighbour ], neighbour } );
                costTable[ neighbour ] = vertexCost + cost;
                minHeap.emplace( costTable[ neighbour ], neighbour );
            }
        }
    }

    return costTable[ end ];
}

int main()
{
    constexpr std::uint16_t maxVertices{ 10000 };

    Graph     graph    ( maxVertices );
    CostTable costTable( maxVertices );

    std::uint16_t testCases;
    std::cin >> testCases;

    while ( testCases-- > 0 )
    {
        for ( auto i{ 0 }; i < maxVertices; ++i )
        {
            graph[ i ].clear();
        }

        std::uint16_t numberOfVertices;
        std::uint16_t numberOfEdges;

        std::cin >> numberOfVertices >> numberOfEdges;

        for ( auto i{ 0 }; i < numberOfEdges; ++i )
        {
            Vertex from;
            Vertex to;
            Cost   cost;

            std::cin >> from >> to >> cost;
            graph[ from ].emplace_back( to, cost );
        }

        Vertex start;
        Vertex end;

        std::cin >> start >> end;

        auto const result{ dijkstra( start, end, graph, costTable ) };

        if ( result == kInfiniteCost )
        {
            std::cout << "NO";
        }
        else
        {
            std::cout << result << '\\n';
        }
    }

    return 0;
}
`;

const DEFAULT_STDIN = `\
3
3 2
1 2 5
2 3 7
1 3
3 3
1 2 4
1 3 7
2 3 1
1 3
3 1
1 2 4
1 3
`;

const DEFAULT_COMPILER_OPTIONS = "-O3 --std=c++17 -Wall -Wextra -Wold-style-cast -Wuseless-cast -Wnull-dereference -Werror -Wfatal-errors -pedantic -pedantic-errors";
const DEFAULT_COMMAND_LINE_ARGUMENTS = "";

editor.onInitialized(() => {
    language.onInitialized(() => {
        editor.sourceEditor.setValue(DEFAULT_SOURCE);

        if (editor.stdinEditor) {
            editor.stdinEditor.setValue(DEFAULT_STDIN);
        }

        editor.compilerOptions.value = DEFAULT_COMPILER_OPTIONS;
        editor.commandLineArguments.value = DEFAULT_COMMAND_LINE_ARGUMENTS;

        const flavor = Object.keys(DEFAULT_LANGUAGE)[0];
        editor.selectLanguage(flavor, DEFAULT_LANGUAGE[flavor]);
    });
});
